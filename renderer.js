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

    render(schedule) {
      const {
        title = "4th Year, 1st Semester",
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        startHour = 6,
        endHour = 19,
        courses = []
      } = schedule;

      const scale = this.scale;
      const ctx = this.ctx;

      // Layout dimensions in CSS pixels (prior to 2x scaling)
      const timeColWidth = 70;
      const colWidth = 105;
      const totalCols = days.length;
      const gridWidth = colWidth * totalCols;
      const topMargin = 70; // Room for title & day labels
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

      // 5. Render Course Blocks (drawn before/under grid lines or with neat clipping)
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

        // Inset slightly by 1px so block sits cleanly inside grid cells with rounded corners
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
        let textY = blockTop + 5;

        // Line 1: Course Code & Section (Bold)
        ctx.font = "bold 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        const line1 = course.section ? `${course.code} [${course.section}]` : course.code;
        ctx.fillText(line1, textX, textY);
        textY += 13;

        // Line 2: Type (Bold, smaller)
        if (course.type && blockHeight > 30) {
          ctx.font = "bold 9.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText(course.type, textX, textY);
          textY += 12;
        }

        // Line 3: Time Span (Regular)
        if (blockHeight > 45) {
          ctx.font = "normal 8.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          const formattedTime = `${ScheduleRenderer.formatTime(courseStart)}-${ScheduleRenderer.formatTime(courseEnd)}`;
          ctx.fillText(formattedTime, textX, textY);
          textY += 11;
        }

        // Line 4: Room (Regular)
        if (course.room && blockHeight > 58) {
          ctx.font = "normal 8.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText(course.room, textX, textY);
        }

        ctx.restore();
      });

      // 6. Render Drafting Grid Lines with Characteristic Extended Border Ticks
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#000000";
      ctx.lineCap = "square";

      const tickExtension = 9; // Grid lines extend 9px past outer border

      // Horizontal Lines
      for (let i = 0; i <= halfHours; i++) {
        const y = gridTop + i * rowHeight;
        ctx.beginPath();
        // Snap to integer/half pixel for razor-sharp rendering
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
        courses = []
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
      svg += `    .course-title { font-weight: bold; font-size: 10.5px; fill: #000; }\n`;
      svg += `    .course-type { font-weight: bold; font-size: 9.5px; fill: #000; }\n`;
      svg += `    .course-sub { font-size: 8.5px; fill: #000; }\n`;
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

      // Courses
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

        svg += `  <g>\n`;
        svg += `    <rect x="${blockLeft}" y="${blockTop}" width="${blockWidth}" height="${blockHeight}" rx="5" ry="5" fill="${course.color || '#c3ecc8'}" stroke="#000000" stroke-width="1.5" />\n`;
        
        const textX = blockLeft + 4;
        let textY = blockTop + 14;
        const line1 = course.section ? `${course.code} [${course.section}]` : course.code;
        svg += `    <text x="${textX}" y="${textY}" class="course-title">${line1}</text>\n`;
        textY += 13;

        if (course.type && blockHeight > 30) {
          svg += `    <text x="${textX}" y="${textY}" class="course-type">${course.type}</text>\n`;
          textY += 12;
        }
        if (blockHeight > 45) {
          const timeStr = `${ScheduleRenderer.formatTime(courseStart)}-${ScheduleRenderer.formatTime(courseEnd)}`;
          svg += `    <text x="${textX}" y="${textY}" class="course-sub">${timeStr}</text>\n`;
          textY += 11;
        }
        if (course.room && blockHeight > 58) {
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
