// Vercel Serverless Function: /api/parse
// Extracts college course schedules from screenshots or raw text using Google Gemini Flash Vision API

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, x-goog-api-key"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Send a POST request." });
  }

  const apiKey = (process.env.GEMINI_API_KEY || req.headers["x-api-key"] || req.body?.apiKey || "").trim();

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured.",
      help: "Add GEMINI_API_KEY to your Vercel project Environment Variables (or pass it in the test key field)."
    });
  }

  const { imageBase64, mimeType = "image/png", text } = req.body || {};

  if (!imageBase64 && !text) {
    return res.status(400).json({ error: "Please provide either an image (imageBase64) or text." });
  }

  const systemPrompt = `You are an expert college schedule parser and extractor.
Your task is to analyze the user's uploaded class schedule (which may be a screenshot of a student portal like Canvas/Banner/Blackboard/AISIS, an enrollment slip, a matrix table, or raw text) and output a clean, structured JSON schedule.

Schema to output:
{
  "title": "Semester / Year title found in the schedule (e.g., '4th Year, 1st Semester', 'Fall 2026', or 'College Schedule')",
  "courses": [
    {
      "code": "Course Code (e.g., 'CS 300', 'SAP 501', 'TECH 101', 'MATH 101')",
      "section": "Section / Block code if present (e.g., 'CS31S4', 'IT41S5'), otherwise empty string",
      "type": "Lecture, Lab, Asynchronous, Synchronous, Recitation, or Discussion",
      "day": "One of: 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'",
      "start": "24-hour start time 'HH:MM' (e.g. '06:30', '07:30', '16:30')",
      "end": "24-hour end time 'HH:MM' (e.g. '07:30', '10:30', '18:30')",
      "room": "Room or location code (e.g. 'Q-5313', 'Q-5216', 'Room 304'), or empty string if asynchronous/online"
    }
  ]
}

Rules:
1. If a single course row meets on multiple days (for example 'MWF', 'Mon/Wed', 'Tue/Thu'), create a separate course object for each day.
2. Convert all 12-hour AM/PM times into 24-hour 'HH:MM' format accurately (e.g., 6:30 AM -> "06:30", 12:00 PM -> "12:00", 4:30 PM -> "16:30", 7:00 PM -> "19:00").
3. Do not include markdown formatting or backticks around the output. Output pure, valid JSON only.`;

  try {
    const parts = [{ text: systemPrompt }];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      parts.push({
        inline_data: {
          mime_type: mimeType || "image/png",
          data: cleanBase64
        }
      });
      parts.push({ text: "Please parse this schedule image into the required JSON format." });
    } else if (text) {
      parts.push({ text: `Please parse this schedule text into the required JSON format:\n\n${text}` });
    }

    const payloadBody = JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    // Model candidate endpoints to try in order of preference (v1 GA first, then v1beta)
    const endpointsToTry = [
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`
    ];

    let lastError = null;
    let successfulData = null;

    for (const url of endpointsToTry) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: payloadBody
        });

        if (response.ok) {
          successfulData = await response.json();
          break;
        } else {
          const errBody = await response.text();
          lastError = { status: response.status, body: errBody, url };
        }
      } catch (fetchErr) {
        lastError = { status: 500, body: fetchErr.message, url };
      }
    }

    // If all candidate endpoints failed, query the models list to diagnose
    if (!successfulData) {
      let availableModels = [];
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
          headers: { "x-goog-api-key": apiKey }
        });
        if (listRes.ok) {
          const listJson = await listRes.json();
          availableModels = (listJson.models || []).map(m => m.name);
        }
      } catch (_) {}

      return res.status(lastError?.status || 500).json({
        error: `Gemini API returned status ${lastError?.status || 500}`,
        details: lastError?.body || "Failed all model candidates",
        availableModels: availableModels.length > 0 ? availableModels : "Could not list models"
      });
    }

    const candidateText = successfulData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(500).json({ error: "No response text received from Gemini." });
    }

    // Clean potential markdown code blocks if present
    const cleanedText = candidateText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsedSchedule = JSON.parse(cleanedText);

    return res.status(200).json({
      success: true,
      data: parsedSchedule
    });
  } catch (err) {
    console.error("Schedule extraction error:", err);
    return res.status(500).json({
      error: "Failed to parse schedule with AI.",
      message: err.message
    });
  }
}
