// Pre-loaded sample data exactly matching the reference schedule image
const initialSchedule = {
  title: "4th Year, 1st Semester",
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  startHour: 6, // 6:00 AM
  endHour: 19,  // 7:00 PM
  courses: [
    {
      id: "c1",
      code: "CS 300",
      section: "CS31S4",
      type: "Asynchronous",
      day: "Monday",
      start: "06:30",
      end: "07:30",
      room: "",
      color: "#df8082"
    },
    {
      id: "c2",
      code: "SAP 501",
      section: "IT41S5",
      type: "Asynchronous",
      day: "Monday",
      start: "10:30",
      end: "11:30",
      room: "",
      color: "#fee382"
    },
    {
      id: "c3",
      code: "CS 403",
      section: "CS31S3",
      type: "Asynchronous",
      day: "Monday",
      start: "11:30",
      end: "12:30",
      room: "",
      color: "#c3ecc8"
    },
    {
      id: "c4",
      code: "CS 403",
      section: "CS31S3",
      type: "Lab",
      day: "Wednesday",
      start: "07:30",
      end: "10:30",
      room: "Q-5313",
      color: "#c3ecc8"
    },
    {
      id: "c5",
      code: "CS 300",
      section: "CS31S4",
      type: "Lecture",
      day: "Thursday",
      start: "16:30",
      end: "18:30",
      room: "Q-5415",
      color: "#df8082"
    },
    {
      id: "c6",
      code: "SAP 501",
      section: "IT41S5",
      type: "Lab",
      day: "Friday",
      start: "07:30",
      end: "10:30",
      room: "Q-5216",
      color: "#fee382"
    },
    {
      id: "c7",
      code: "SAP 501",
      section: "IT41S5",
      type: "Lecture",
      day: "Friday",
      start: "10:30",
      end: "11:30",
      room: "Q-5216",
      color: "#fee382"
    },
    {
      id: "c8",
      code: "CS 403",
      section: "CS31S3",
      type: "Lecture",
      day: "Friday",
      start: "14:30",
      end: "15:30",
      room: "Q-5312",
      color: "#c3ecc8"
    },
    {
      id: "c9",
      code: "TECH 101",
      section: "CS41S2",
      type: "Lecture",
      day: "Saturday",
      start: "07:30",
      end: "10:30",
      room: "Q-5312",
      color: "#9fd3d3"
    }
  ]
};

// Pastel color palette for automatic assignment to new courses
const defaultPalette = [
  "#df8082", // Coral / Soft Red (CS 300)
  "#c3ecc8", // Mint / Light Green (CS 403)
  "#fee382", // Butter Yellow (SAP 501)
  "#9fd3d3", // Soft Teal / Cyan (TECH 101)
  "#d6c6e1", // Soft Lavender
  "#fbc4ab", // Peach
  "#c5d3e8", // Soft Sky Blue
  "#e8dff5", // Lilac
  "#fcf6bd", // Lemon Chiffon
  "#d0f4de"  // Light Seafoam
];

// Attach to global window
window.initialSchedule = initialSchedule;
window.defaultPalette = defaultPalette;
