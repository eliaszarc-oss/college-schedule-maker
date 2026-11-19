// Vercel Serverless Function: /api/parse
// Extracts college course schedules from screenshots, registration forms, or raw text using Google Gemini Vision API

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
      help: "Add GEMINI_API_KEY to your Vercel project Environment Variables (or enter a key in Settings)."
    });
  }

  const { imageBase64, mimeType = "image/jpeg", text } = req.body || {};

  if (!imageBase64 && !text) {
    return res.status(400).json({ error: "Please provide either an image (imageBase64) or text." });
  }

  const systemPrompt = `You are an expert college schedule parser and extractor.
Your task is to analyze the user's uploaded class schedule, Student Registration Form (such as from Technological Institute of the Philippines / T.I.P., Canvas, Banner, Blackboard, AnimoSys, etc.), syllabus table, or photo of an enrollment slip, and extract all scheduled class meetings into clean JSON.

Output Schema:
{
  "title": "Semester and Year or Program found on the form (e.g. 'Second Semester 2026-2027', '3rd Year, 2nd Semester', or 'College Schedule')",
  "courses": [
    {
      "code": "Course Code (e.g. 'CS 006', 'CS 302', 'CSELEC 001', 'CS 300')",
      "section": "Section or Block code (e.g. 'CS32S1', 'CS31S4'), or empty string",
      "type": "Lecture, Lab, Asynchronous, Synchronous, or Recitation (infer from hours or room, e.g. 3-hour session is typically Lab, 1-2 hours is Lecture; if unsure default to 'Lecture')",
      "day": "Full day name: exactly one of 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'",
      "start": "24-hour start time in 'HH:MM' format (e.g. '07:30', '10:30', '11:30', '13:30', '14:30', '16:30')",
      "end": "24-hour end time in 'HH:MM' format (e.g. '09:30', '12:30', '13:30', '16:30', '17:30', '18:30')",
      "room": "Classroom / Room code (e.g. 'Q-5403', 'Q-5506', 'Q-5216', 'Q-5215', 'Q-5312'), or empty string if online/asynchronous"
    }
  ]
}

Critical Instructions:
1. Multi-meeting courses: When a course lists multiple days/times/rooms (for example: CS 006 has 'Mo 11:30 AM - 12:30 PM Q-5403' AND 'Th 07:30 AM - 09:30 AM Q-5506'), create a separate course object for each meeting time!
2. Day name mapping:
   - 'Mo', 'M', 'Mon' -> 'Monday'
   - 'Tu', 'T', 'Tue' -> 'Tuesday'
   - 'We', 'W', 'Wed' -> 'Wednesday'
   - 'Th', 'TH', 'Thu' -> 'Thursday'
   - 'Fr', 'F', 'Fri' -> 'Friday'
   - 'Sa', 'Sat', 'S' -> 'Saturday'
   - 'Su', 'Sun' -> 'Sunday'
3. Time conversion: Accurately convert 12-hour AM/PM times into 24-hour 'HH:MM':
   - 07:30 AM -> "07:30"
   - 11:30 AM -> "11:30"
   - 12:30 PM -> "12:30"
   - 01:30 PM -> "13:30"
   - 02:30 PM -> "14:30"
   - 03:30 PM -> "15:30"
   - 04:30 PM -> "16:30"
   - 05:30 PM -> "17:30"
4. Disregard non-schedule sections such as Tuition Fees, Payments, Student Number, Billing, and Terms & Conditions. Focus solely on the enrolled courses schedule table.
5. Return pure JSON without markdown backticks or commentary.`;

  try {
    const parts = [{ text: systemPrompt }];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: cleanBase64
        }
      });
      parts.push({ text: "Please parse this registration form schedule into the required JSON format." });
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

    // Validated models available in Google Generative AI catalog
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.5-flash",
      "gemini-3.1-pro-preview"
    ];

    let lastError = null;
    let successfulData = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
          lastError = { status: response.status, body: errBody, model };
        }
      } catch (fetchErr) {
        lastError = { status: 500, body: fetchErr.message, model };
      }
    }

    if (!successfulData) {
      return res.status(lastError?.status || 500).json({
        error: `Gemini API returned status ${lastError?.status || 500}`,
        details: lastError?.body || "Failed all model candidates",
        failedModel: lastError?.model
      });
    }

    const candidateText = successfulData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.status(500).json({ error: "No response text received from Gemini." });
    }

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
