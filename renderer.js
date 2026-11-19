// Schedule rendering engine - exact replica of the drafting grid design
(() => {
  class ScheduleRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.scale = 2; // 2x resolution for high-DPI crystal clear exports
    }

    // Parse "HH:MM" string into decimal hours (e.g., "07:30" -> 7.5)
    static timeToDecimal(timeStr) {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(":").map(Number);
      return h + (m || 0) / 60;
    }

    // Format decimal hour to 12-hour string (e.g., 7.5 -> "7:30AM", 13.0 -> "1:00PM")
    static formatTime(decimalHour) {
      const totalMinutes = Math.round(decimalHour * 60);
      let hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const ampm = hours >= 12 ? "PM" : "AM";
      if (hours === 0) hours = 12;
      else if (hours > 12) hours -= 12;
      const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
      return `${hours}:${minStr}${ampm}`;
    }

    // Identify gaps (vacant hours) between scheduled classes on each day
    static getVacantSlots(courses, days, startHour, endHour) {
      const vacantSlots = [];
      days.forEach((day, dayIndex) => {
        const dayCourses = courses
          .filter(c => c.day === day)
          .map(c => ({
            ...c,
            startDec: ScheduleRenderer.timeToDecimal(c.start),
            endDec: ScheduleRenderer.timeToDecimal(c.end)
          }))
          .filter(c => c.endDec > startHour && c.startDec < endHour)
          .sort((a, b) => a.startDec - b.startDec);

        if (dayCourses.length >= 2) {
          for (let i = 0; i < dayCourses.length - 1; i++) {
            const cEnd = Math.max(dayCourses[i].endDec, startHour);
            const nStart = Math.min(dayCourses[i + 1].startDec, endHour);
            const gap = nStart - cEnd;
            if (gap >= 0.5) {
              vacantSlots.push({
                day,
                dayIndex,
                start: cEnd,
                end: nStart,
                duration: gap
              });
            }
          }
        }
      });
      return vacantSlots;
    }

    render(schedule) {
      const {
        title = "4th Year, 1st Semester",
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        startHour = 6,
        endHour = 19,
        courses = [],
        showVacant = false
      } = schedule;

      const scale = this.scale;
      const ctx = this.ctx;

      // Layout dimensions in CSS pixels (prior to 2x scaling)
      const timeColWidth = 70;
      const colWidth = 105;
      const totalCols = days.length;
      const gridWidth = colWidth * totalCols;
      const topMargin = 70;
      const dayLabelY = 56;
      const titleY = 28;
      const bottomMargin = 40;
      const rightMargin = 30;

      const halfHours = (endHour - startHour) * 2;
      const rowHeight = 28; // height per 30-minute block
      const gridHeight = halfHours * rowHeight;

      const gridLeft = timeColWidth;
      const gridRight = gridLeft + gridWidth;
      const gridTop = topMargin;
      const gridBottom = gridTop + gridHeight;

      const totalWidth = gridRight + rightMargin;
      const totalHeight = gridBottom + bottomMargin;

      // Set canvas dimensions
      this.canvas.width = totalWidth * scale;
      this.canvas.height = totalHeight * scale;
      this.canvas.style.width = `${totalWidth}px`;
      this.canvas.style.height = `${totalHeight}px`;

      ctx.save();
      ctx.scale(scale, scale);

      // 1. Clean White Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // 2. Render Title
      ctx.fillStyle = "#000000";
      ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(title, gridLeft + gridWidth / 2, titleY);

      // 3. Render Day Headers
      ctx.font = "500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      for (let d = 0; d < days.length; d++) {
        const colCenterX = gridLeft + d * colWidth + colWidth / 2;
        ctx.fillText(days[d], colCenterX, dayLabelY);
      }

      // 4. Render Time Labels on the Left
      ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      for (let i = 0; i <= halfHours; i++) {
        const currentHour = startHour + i * 0.5;
        const y = gridTop + i * rowHeight;
        const timeLabel = ScheduleRenderer.formatTime(currentHour);
        ctx.fillText(timeLabel, gridLeft - 10, y);
      }

      // 5. Render Vacant Hours (if enabled)
      if (showVacant) {
        const vacantSlots = ScheduleRenderer.getVacantSlots(courses, days, startHour, endHour);
        vacantSlots.forEach(slot => {
          const vTop = gridTop + (slot.start - startHour) * 2 * rowHeight;
          const vHeight = (slot.end - slot.start) * 2 * rowHeight;
          const vLeft = gridLeft + slot.dayIndex * colWidth;
          const vWidth = colWidth;

          const padX = 2;
          const padY = 2;
          const r = 4;

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(vLeft + padX, vTop + padY, vWidth - padX * 2, vHeight - padY * 2, r);

          ctx.fillStyle = "#f8fafc";
          ctx.fill();

          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "#94a3b8";
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.fillStyle = "#64748b";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const centerX = vLeft + vWidth / 2;
          const centerY = vTop + vHeight / 2;
          const durationStr = slot.duration === 1 ? "1 hr" : (slot.duration % 1 === 0 ? `${slot.duration} hrs` : `${Math.floor(slot.duration)}h 30m`);

          if (vHeight >= 45) {
            ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.fillText("VACANT", centerX, centerY - 6);
            ctx.font = "normal 8px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.fillText(`(${durationStr})`, centerX, centerY + 6);
          } else if (vHeight >= 22) {
            ctx.font = "bold 8.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            ctx.fillText(`Vacant (${durationStr})`, centerX, centerY);
          }

          ctx.restore();
        });
      }

      // 6. Render Course Blocks
      courses.forEach(course => {
        const dayIndex = days.indexOf(course.day);
        if (dayIndex === -1) return;

        const courseStart = ScheduleRenderer.timeToDecimal(course.start);
        const courseEnd = ScheduleRenderer.timeToDecimal(course.end);

        if (courseEnd <= startHour || courseStart >= endHour) return;

        const clampedStart = Math.max(courseStart, startHour);
        const clampedEnd = Math.min(courseEnd, endHour);

        const blockTop = gridTop + (clampedStart - startHour) * 2 * rowHeight;
        const blockHeight = (clampedEnd - clampedStart) * 2 * rowHeight;
        const blockLeft = gridLeft + dayIndex * colWidth;
        const blockWidth = colWidth;

        const padX = 1;
        const padY = 1;
        const r = 5; // rounded corner radius

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(blockLeft + padX, blockTop + padY, blockWidth - padX * 2, blockHeight - padY * 2, r);

        // Fill background
        ctx.fillStyle = course.color || "#c3ecc8";
        ctx.fill();

        // Border: solid black 1.5px
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#000000";
        ctx.stroke();

        // Text inside course block
        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        const textX = blockLeft + 5;
        const isCompact = blockHeight <= 60; // 1-hour block is 56px
        let textY = blockTop + (isCompact ? 3.5 : 5);

        // Line 1: Course Code & Section (Bold)
        ctx.font = (isCompact ? "bold 10px " : "bold 10.5px ") + "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        const line1 = course.section ? `${course.code} [${course.section}]` : course.code;
        ctx.fillText(line1, textX, textY);
        textY += isCompact ? 11.5 : 13;

        // Line 2: Type (Bold, smaller)
        if (course.type && blockHeight >= 28) {
          ctx.font = (isCompact ? "bold 9px " : "bold 9.5px ") + "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText(course.type, textX, textY);
          textY += isCompact ? 10.5 : 12;
        }

        // Line 3: Time Span (Regular)
        if (blockHeight >= 42) {
          ctx.font = (isCompact ? "normal 8px " : "normal 8.5px ") + "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          const formattedTime = `${ScheduleRenderer.formatTime(courseStart)}-${ScheduleRenderer.formatTime(courseEnd)}`;
          ctx.fillText(formattedTime, textX, textY);
          textY += isCompact ? 10 : 11;
        }

        // Line 4: Room (Regular) - displays for all 1-hour and longer courses
        if (course.room && blockHeight >= 48) {
          ctx.font = (isCompact ? "normal 8px " : "normal 8.5px ") + "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText(course.room, textX, textY);
        }

        ctx.restore();
      });

      // 7. Render Drafting Grid Lines with Characteristic Extended Border Ticks
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#000000";
      ctx.lineCap = "square";

      const tickExtension = 9;

      // Horizontal Lines
      for (let i = 0; i <= halfHours; i++) {
        const y = gridTop + i * rowHeight;
        ctx.beginPath();
        const alignedY = Math.round(y) + 0.5;
        ctx.moveTo(gridLeft - tickExtension, alignedY);
        ctx.lineTo(gridRight + tickExtension, alignedY);
        ctx.stroke();
      }

      // Vertical Lines
      for (let d = 0; d <= totalCols; d++) {
        const x = gridLeft + d * colWidth;
        ctx.beginPath();
        const alignedX = Math.round(x) + 0.5;
        ctx.moveTo(alignedX, gridTop - tickExtension);
        ctx.lineTo(alignedX, gridBottom + tickExtension);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Generate downloadable high-resolution PNG data URL
    toDataURL() {
      return this.canvas.toDataURL("image/png");
    }

    // Generate scalable vector SVG string
    toSVG(schedule) {
      const {
        title = "4th Year, 1st Semester",
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        startHour = 6,
        endHour = 19,
        courses = [],
        showVacant = false
      } = schedule;

      const timeColWidth = 70;
      const colWidth = 105;
      const totalCols = days.length;
      const gridWidth = colWidth * totalCols;
      const topMargin = 70;
      const dayLabelY = 56;
      const titleY = 28;
      const bottomMargin = 40;
      const rightMargin = 30;

      const halfHours = (endHour - startHour) * 2;
      const rowHeight = 28;
      const gridHeight = halfHours * rowHeight;

      const gridLeft = timeColWidth;
      const gridRight = gridLeft + gridWidth;
      const gridTop = topMargin;
      const gridBottom = gridTop + gridHeight;
      const tickExtension = 9;

      const totalWidth = gridRight + rightMargin;
      const totalHeight = gridBottom + bottomMargin;

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">\n`;
      svg += `  <style>\n`;
      svg += `    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }\n`;
      svg += `    .title { font-weight: bold; font-size: 15px; text-anchor: middle; }\n`;
      svg += `    .day { font-weight: 500; font-size: 13px; text-anchor: middle; }\n`;
      svg += `    .time { font-weight: 500; font-size: 11px; text-anchor: end; }\n`;
      svg += `    .course-title { font-weight: bold; font-size: 10px; fill: #000; }\n`;
      svg += `    .course-type { font-weight: bold; font-size: 9px; fill: #000; }\n`;
      svg += `    .course-sub { font-size: 8px; fill: #000; }\n`;
      svg += `    .vacant-text { font-size: 8.5px; font-weight: bold; fill: #64748b; text-anchor: middle; }\n`;
      svg += `    .vacant-sub { font-size: 7.5px; fill: #64748b; text-anchor: middle; }\n`;
      svg += `  </style>\n`;

      // Background
      svg += `  <rect width="100%" height="100%" fill="#ffffff" />\n`;

      // Title
      svg += `  <text x="${gridLeft + gridWidth / 2}" y="${titleY}" class="title">${title}</text>\n`;

      // Days
      days.forEach((day, d) => {
        const colCenterX = gridLeft + d * colWidth + colWidth / 2;
        svg += `  <text x="${colCenterX}" y="${dayLabelY}" class="day">${day}</text>\n`;
      });

      // Time labels
      for (let i = 0; i <= halfHours; i++) {
        const currentHour = startHour + i * 0.5;
        const y = gridTop + i * rowHeight + 4;
        svg += `  <text x="${gridLeft - 10}" y="${y}" class="time">${ScheduleRenderer.formatTime(currentHour)}</text>\n`;
      }

      // Vacant hours in SVG
      if (showVacant) {
        const vacantSlots = ScheduleRenderer.getVacantSlots(courses, days, startHour, endHour);
        vacantSlots.forEach(slot => {
          const vTop = gridTop + (slot.start - startHour) * 2 * rowHeight + 2;
          const vHeight = (slot.end - slot.start) * 2 * rowHeight - 4;
          const vLeft = gridLeft + slot.dayIndex * colWidth + 2;
          const vWidth = colWidth - 4;
          const centerX = vLeft + vWidth / 2;
          const centerY = vTop + vHeight / 2;
          const durationStr = slot.duration === 1 ? "1 hr" : (slot.duration % 1 === 0 ? `${slot.duration} hrs` : `${Math.floor(slot.duration)}h 30m`);

          svg += `  <g>\n`;
          svg += `    <rect x="${vLeft}" y="${vTop}" width="${vWidth}" height="${vHeight}" rx="4" ry="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />\n`;
          if (vHeight >= 45) {
            svg += `    <text x="${centerX}" y="${centerY - 2}" class="vacant-text">VACANT</text>\n`;
            svg += `    <text x="${centerX}" y="${centerY + 10}" class="vacant-sub">(${durationStr})</text>\n`;
          } else if (vHeight >= 22) {
            svg += `    <text x="${centerX}" y="${centerY + 3}" class="vacant-text">Vacant (${durationStr})</text>\n`;
          }
          svg += `  </g>\n`;
        });
      }

      // Courses in SVG
      courses.forEach(course => {
        const dayIndex = days.indexOf(course.day);
        if (dayIndex === -1) return;
        const courseStart = ScheduleRenderer.timeToDecimal(course.start);
        const courseEnd = ScheduleRenderer.timeToDecimal(course.end);
        if (courseEnd <= startHour || courseStart >= endHour) return;

        const clampedStart = Math.max(courseStart, startHour);
        const clampedEnd = Math.min(courseEnd, endHour);

        const blockTop = gridTop + (clampedStart - startHour) * 2 * rowHeight + 1;
        const blockHeight = (clampedEnd - clampedStart) * 2 * rowHeight - 2;
        const blockLeft = gridLeft + dayIndex * colWidth + 1;
        const blockWidth = colWidth - 2;

        const isCompact = blockHeight <= 60;
        let textY = blockTop + (isCompact ? 12 : 14);

        svg += `  <g>\n`;
        svg += `    <rect x="${blockLeft}" y="${blockTop}" width="${blockWidth}" height="${blockHeight}" rx="5" ry="5" fill="${course.color || '#c3ecc8'}" stroke="#000000" stroke-width="1.5" />\n`;
        
        const textX = blockLeft + 4;
        const line1 = course.section ? `${course.code} [${course.section}]` : course.code;
        svg += `    <text x="${textX}" y="${textY}" class="course-title">${line1}</text>\n`;
        textY += isCompact ? 11 : 13;

        if (course.type && blockHeight >= 28) {
          svg += `    <text x="${textX}" y="${textY}" class="course-type">${course.type}</text>\n`;
          textY += isCompact ? 10 : 12;
        }
        if (blockHeight >= 42) {
          const timeStr = `${ScheduleRenderer.formatTime(courseStart)}-${ScheduleRenderer.formatTime(courseEnd)}`;
          svg += `    <text x="${textX}" y="${textY}" class="course-sub">${timeStr}</text>\n`;
          textY += isCompact ? 10 : 11;
        }
        if (course.room && blockHeight >= 48) {
          svg += `    <text x="${textX}" y="${textY}" class="course-sub">${course.room}</text>\n`;
        }
        svg += `  </g>\n`;
      });

      // Grid lines with ticks
      for (let i = 0; i <= halfHours; i++) {
        const y = gridTop + i * rowHeight;
        svg += `  <line x1="${gridLeft - tickExtension}" y1="${y}" x2="${gridRight + tickExtension}" y2="${y}" stroke="#000000" stroke-width="1.5" stroke-linecap="square" />\n`;
      }
      for (let d = 0; d <= totalCols; d++) {
        const x = gridLeft + d * colWidth;
        svg += `  <line x1="${x}" y1="${gridTop - tickExtension}" x2="${x}" y2="${gridBottom + tickExtension}" stroke="#000000" stroke-width="1.5" stroke-linecap="square" />\n`;
      }

      svg += `</svg>`;
      return svg;
    }
  }

  window.ScheduleRenderer = ScheduleRenderer;
})();
