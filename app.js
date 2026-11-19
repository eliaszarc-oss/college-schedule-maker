// Main Application Logic
(() => {
  const initialSchedule = window.initialSchedule;
  const defaultPalette = window.defaultPalette;
  const ScheduleRenderer = window.ScheduleRenderer;

  // Application State
  let schedule = JSON.parse(localStorage.getItem("saved_schedule")) || initialSchedule;
  let customApiKey = localStorage.getItem("dev_gemini_key") || "";
  let isLoading = false;

  // DOM Elements
  const canvas = document.getElementById("scheduleCanvas");
  const renderer = new ScheduleRenderer(canvas);

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const textInput = document.getElementById("textInput");
  const parseTextBtn = document.getElementById("parseTextBtn");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingStatus = document.getElementById("loadingStatus");

  const scheduleTitleInput = document.getElementById("scheduleTitle");
  const daysFilter = document.getElementById("daysFilter");
  const startHourSelect = document.getElementById("startHourSelect");
  const endHourSelect = document.getElementById("endHourSelect");
  const autoFitBtn = document.getElementById("autoFitBtn");
  const vacantToggle = document.getElementById("vacantToggle");
  const coursesList = document.getElementById("coursesList");
  const addCourseBtn = document.getElementById("addCourseBtn");

  const exportPngBtn = document.getElementById("exportPngBtn");
  const exportSvgBtn = document.getElementById("exportSvgBtn");
  const resetSampleBtn = document.getElementById("resetSampleBtn");
  const clearBtn = document.getElementById("clearBtn");
  const saveJsonBtn = document.getElementById("saveJsonBtn");
  const loadJsonBtn = document.getElementById("loadJsonBtn");
  const jsonFileInput = document.getElementById("jsonFileInput");

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");

  // Initialize
  function init() {
    populateHourSelects();
    syncFormFromState();
    render();
    setupEventListeners();
  }

  function populateHourSelects() {
    startHourSelect.innerHTML = "";
    endHourSelect.innerHTML = "";

    for (let h = 5; h <= 22; h++) {
      const timeLabel = ScheduleRenderer.formatTime(h);
      const startOpt = new Option(timeLabel, h, false, h === schedule.startHour);
      startHourSelect.add(startOpt);

      const endOpt = new Option(timeLabel, h, false, h === schedule.endHour);
      endHourSelect.add(endOpt);
    }
  }

  function syncFormFromState() {
    scheduleTitleInput.value = schedule.title || "4th Year, 1st Semester";
    startHourSelect.value = schedule.startHour || 6;
    endHourSelect.value = schedule.endHour || 19;

    if (schedule.days.length === 5) {
      daysFilter.value = "5";
    } else if (schedule.days.length === 6) {
      daysFilter.value = "6";
    } else {
      daysFilter.value = "7";
    }

    if (vacantToggle) {
      vacantToggle.checked = !!schedule.showVacant;
    }

    renderCoursesList();
  }

  function render() {
    renderer.render(schedule);
    localStorage.setItem("saved_schedule", JSON.stringify(schedule));
  }

  // Render the list of courses in the sidebar
  function renderCoursesList() {
    coursesList.innerHTML = "";
    const countBadge = document.getElementById("coursesCount");
    if (countBadge) countBadge.textContent = `${schedule.courses.length}`;

    if (schedule.courses.length === 0) {
      coursesList.innerHTML = `
        <div class="text-center py-8 text-neutral-400 text-xs border border-dashed border-neutral-200 rounded-lg">
          No courses in schedule yet.<br/>Drop a screenshot or click "+ Add Course".
        </div>
      `;
      return;
    }

    schedule.courses.forEach((course, index) => {
      const card = document.createElement("div");
      card.className = "p-3 bg-white rounded-lg border border-neutral-200 shadow-xs hover:border-neutral-300 transition-all space-y-2.5 text-xs";

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-1">
            <input type="color" value="${course.color || '#c3ecc8'}" class="color-picker w-6 h-6 rounded cursor-pointer border border-neutral-300 p-0" title="Change Color" />
            <input type="text" value="${escapeHtml(course.code)}" placeholder="Course Code (e.g. CS 300)" class="course-code font-bold text-neutral-800 bg-neutral-50 px-2 py-1 rounded border border-neutral-200 flex-1 focus:bg-white focus:outline-neutral-900" />
            <input type="text" value="${escapeHtml(course.section || '')}" placeholder="[Section]" class="course-section text-neutral-600 bg-neutral-50 px-1.5 py-1 rounded border border-neutral-200 w-20 focus:bg-white focus:outline-neutral-900" />
          </div>
          <button class="delete-btn text-neutral-400 hover:text-red-600 transition-colors p-1" title="Delete Course">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[10px] text-neutral-400 font-medium">Type</label>
            <select class="course-type w-full bg-neutral-50 px-2 py-1 rounded border border-neutral-200 focus:bg-white focus:outline-neutral-900">
              <option value="Lecture" ${course.type === 'Lecture' ? 'selected' : ''}>Lecture</option>
              <option value="Lab" ${course.type === 'Lab' ? 'selected' : ''}>Lab</option>
              <option value="Asynchronous" ${course.type === 'Asynchronous' ? 'selected' : ''}>Asynchronous</option>
              <option value="Synchronous" ${course.type === 'Synchronous' ? 'selected' : ''}>Synchronous</option>
              <option value="Recitation" ${course.type === 'Recitation' ? 'selected' : ''}>Recitation</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] text-neutral-400 font-medium">Day</label>
            <select class="course-day w-full bg-neutral-50 px-2 py-1 rounded border border-neutral-200 focus:bg-white focus:outline-neutral-900">
              ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => `
                <option value="${d}" ${course.day === d ? 'selected' : ''}>${d}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-[10px] text-neutral-400 font-medium">Start</label>
            <input type="time" value="${course.start || '08:00'}" class="course-start w-full bg-neutral-50 px-1.5 py-1 rounded border border-neutral-200 focus:bg-white focus:outline-neutral-900" />
          </div>
          <div>
            <label class="text-[10px] text-neutral-400 font-medium">End</label>
            <input type="time" value="${course.end || '09:00'}" class="course-end w-full bg-neutral-50 px-1.5 py-1 rounded border border-neutral-200 focus:bg-white focus:outline-neutral-900" />
          </div>
          <div>
            <label class="text-[10px] text-neutral-400 font-medium">Room</label>
            <input type="text" value="${escapeHtml(course.room || '')}" placeholder="e.g. Q-5313" class="course-room w-full bg-neutral-50 px-1.5 py-1 rounded border border-neutral-200 focus:bg-white focus:outline-neutral-900" />
          </div>
        </div>
      `;

      const colorPicker = card.querySelector(".color-picker");
      const codeInput = card.querySelector(".course-code");
      const sectionInput = card.querySelector(".course-section");
      const typeSelect = card.querySelector(".course-type");
      const daySelect = card.querySelector(".course-day");
      const startInput = card.querySelector(".course-start");
      const endInput = card.querySelector(".course-end");
      const roomInput = card.querySelector(".course-room");
      const deleteBtn = card.querySelector(".delete-btn");

      colorPicker.addEventListener("input", (e) => {
        course.color = e.target.value;
        render();
      });

      codeInput.addEventListener("input", (e) => {
        course.code = e.target.value;
        render();
      });

      sectionInput.addEventListener("input", (e) => {
        course.section = e.target.value.replace(/[\[\]]/g, "");
        render();
      });

      typeSelect.addEventListener("change", (e) => {
        course.type = e.target.value;
        render();
      });

      daySelect.addEventListener("change", (e) => {
        course.day = e.target.value;
        render();
      });

      startInput.addEventListener("change", (e) => {
        course.start = e.target.value;
        render();
      });

      endInput.addEventListener("change", (e) => {
        course.end = e.target.value;
        render();
      });

      roomInput.addEventListener("input", (e) => {
        course.room = e.target.value;
        render();
      });

      deleteBtn.addEventListener("click", () => {
        schedule.courses.splice(index, 1);
        renderCoursesList();
        render();
      });

      coursesList.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Send image or text to backend AI extraction endpoint
  async function sendToAI({ imageBase64, mimeType, text }) {
    setLoading(true, "AI is analyzing schedule and identifying classes...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const payload = { imageBase64, mimeType, text };
      if (customApiKey) {
        payload.apiKey = customApiKey;
      }

      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customApiKey ? { "x-api-key": customApiKey } : {})
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok || !result.success) {
        let msg = result.error || "Failed to parse schedule.";
        if (result.details) {
          try {
            const parsedDetails = typeof result.details === "string" ? JSON.parse(result.details) : result.details;
            if (parsedDetails.error?.message) {
              msg += `\n\nGoogle Error: ${parsedDetails.error.message}`;
            }
          } catch (_) {
            msg += `\n\n${result.details}`;
          }
        }
        if (result.help) msg += `\n\n${result.help}`;
        alert(`AI Extraction Error:\n${msg}`);
        return;
      }

      const parsedData = result.data;
      applyParsedSchedule(parsedData);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("AI Parse Network Error:", err);
      if (err.name === "AbortError") {
        alert("The request timed out after 45 seconds. Please try again with a clearer or smaller image.");
      } else {
        alert(`Could not connect to AI backend: ${err.message}.\n\nWhen deployed to Vercel, this works automatically. If testing locally, make sure you enter your free API key in Settings.`);
      }
    } finally {
      setLoading(false);
    }
  }

  // Merge parsed courses and assign harmonious pastel colors
  function applyParsedSchedule(parsedData) {
    if (parsedData.title) {
      schedule.title = parsedData.title;
    }

    if (Array.isArray(parsedData.courses) && parsedData.courses.length > 0) {
      const courseColorMap = {};
      let paletteIdx = 0;

      const newCourses = parsedData.courses.map((c, i) => {
        const codeKey = (c.code || "").trim().toUpperCase();
        if (!courseColorMap[codeKey]) {
          courseColorMap[codeKey] = defaultPalette[paletteIdx % defaultPalette.length];
          paletteIdx++;
        }

        return {
          id: `c_${Date.now()}_${i}`,
          code: c.code || "Course",
          section: (c.section || "").replace(/[\[\]]/g, ""),
          type: c.type || "Lecture",
          day: c.day || "Monday",
          start: c.start || "08:00",
          end: c.end || "09:00",
          room: c.room || "",
          color: courseColorMap[codeKey]
        };
      });

      schedule.courses = newCourses;
      autoFitTimeRange();
    }

    syncFormFromState();
    render();
  }

  // Auto-adjust start and end hour to fit all scheduled courses snugly
  function autoFitTimeRange() {
    if (!schedule.courses || schedule.courses.length === 0) return;

    let earliest = 24;
    let latest = 0;

    schedule.courses.forEach(c => {
      const s = ScheduleRenderer.timeToDecimal(c.start);
      const e = ScheduleRenderer.timeToDecimal(c.end);
      if (s < earliest) earliest = s;
      if (e > latest) latest = e;
    });

    if (earliest < 24 && latest > 0) {
      schedule.startHour = Math.max(5, Math.floor(earliest));
      schedule.endHour = Math.min(23, Math.ceil(latest));
      startHourSelect.value = schedule.startHour;
      endHourSelect.value = schedule.endHour;
    }
  }

  function setLoading(active, statusText = "Processing...") {
    isLoading = active;
    if (loadingOverlay) {
      loadingOverlay.classList.toggle("hidden", !active);
      if (loadingStatus) loadingStatus.textContent = statusText;
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // Global Clipboard Paste (Ctrl+V) listener
    window.addEventListener("paste", (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf("image") === 0) {
          const file = item.getAsFile();
          handleImageFile(file);
          e.preventDefault();
          return;
        }
      }
    });

    // Drag and Drop
    dropzone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("border-neutral-900", "bg-neutral-50");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("border-neutral-900", "bg-neutral-50");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("border-neutral-900", "bg-neutral-50");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    // Parse Text Button
    parseTextBtn.addEventListener("click", () => {
      const text = textInput.value.trim();
      if (!text) {
        alert("Please paste your syllabus or schedule text into the box.");
        return;
      }
      sendToAI({ text });
    });

    // Header Title Change
    scheduleTitleInput.addEventListener("input", (e) => {
      schedule.title = e.target.value;
      render();
    });

    // Days Filter Change (5, 6, or 7 days)
    daysFilter.addEventListener("change", (e) => {
      const count = parseInt(e.target.value);
      if (count === 5) {
        schedule.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      } else if (count === 6) {
        schedule.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      } else {
        schedule.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      }
      render();
    });

    // Hour Range Changes
    startHourSelect.addEventListener("change", (e) => {
      const val = parseInt(e.target.value);
      if (val >= schedule.endHour) {
        alert("Start time must be before end time.");
        startHourSelect.value = schedule.startHour;
        return;
      }
      schedule.startHour = val;
      render();
    });

    endHourSelect.addEventListener("change", (e) => {
      const val = parseInt(e.target.value);
      if (val <= schedule.startHour) {
        alert("End time must be after start time.");
        endHourSelect.value = schedule.endHour;
        return;
      }
      schedule.endHour = val;
      render();
    });

    // Auto-fit button
    autoFitBtn.addEventListener("click", () => {
      autoFitTimeRange();
      render();
    });

    // Vacant Hours toggle
    if (vacantToggle) {
      vacantToggle.addEventListener("change", (e) => {
        schedule.showVacant = e.target.checked;
        render();
      });
    }

    // Add Course Button
    addCourseBtn.addEventListener("click", () => {
      const nextColor = defaultPalette[schedule.courses.length % defaultPalette.length];
      schedule.courses.push({
        id: `c_${Date.now()}`,
        code: "NEW COURSE",
        section: "",
        type: "Lecture",
        day: "Monday",
        start: "08:00",
        end: "09:30",
        room: "TBA",
        color: nextColor
      });
      renderCoursesList();
      render();
    });

    // Export Buttons
    exportPngBtn.addEventListener("click", () => {
      const dataUrl = renderer.toDataURL();
      const link = document.createElement("a");
      const filename = `${(schedule.title || "schedule").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    });

    exportSvgBtn.addEventListener("click", () => {
      const svgContent = renderer.toSVG(schedule);
      const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `${(schedule.title || "schedule").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.svg`;
      link.download = filename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });

    // Reset to Sample
    resetSampleBtn.addEventListener("click", () => {
      if (confirm("Reset schedule back to the original sample?")) {
        schedule = JSON.parse(JSON.stringify(initialSchedule));
        syncFormFromState();
        render();
      }
    });

    // Clear All
    clearBtn.addEventListener("click", () => {
      if (confirm("Clear all courses from the schedule?")) {
        schedule.courses = [];
        syncFormFromState();
        render();
      }
    });

    // Save / Load JSON
    saveJsonBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "schedule_backup.json";
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });

    loadJsonBtn.addEventListener("click", () => jsonFileInput.click());
    jsonFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loaded = JSON.parse(event.target.result);
          if (loaded && loaded.courses) {
            schedule = loaded;
            syncFormFromState();
            render();
          } else {
            alert("Invalid schedule JSON file.");
          }
        } catch (err) {
          alert("Failed to parse JSON file.");
        }
      };
      reader.readAsText(file);
    });

    // Settings Modal (for testing API key locally)
    settingsBtn.addEventListener("click", () => {
      apiKeyInput.value = customApiKey;
      settingsModal.classList.remove("hidden");
    });

    closeSettingsBtn.addEventListener("click", () => {
      settingsModal.classList.add("hidden");
    });

    saveSettingsBtn.addEventListener("click", () => {
      customApiKey = apiKeyInput.value.trim();
      if (customApiKey) {
        localStorage.setItem("dev_gemini_key", customApiKey);
        alert("Custom API key saved!");
      } else {
        localStorage.removeItem("dev_gemini_key");
        alert("Settings saved. Using default AI.");
      }
    });
  }

  function handleImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please select or drop a valid image file (PNG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = c.toDataURL("image/jpeg", 0.88);
          sendToAI({
            imageBase64: compressed,
            mimeType: "image/jpeg"
          });
        } else {
          sendToAI({
            imageBase64: e.target.result,
            mimeType: file.type || "image/jpeg"
          });
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Start app
  init();
})();
