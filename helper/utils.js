const fs = require("fs");

const { JSDOM } = require("jsdom");

const convertDateStrings = (obj) => {
  for (let k in obj) {
    if (typeof obj[k] === "object" && obj[k] !== null) {
      convertDateStrings(obj[k]);
    } else {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(obj[k])) {
        obj[k] = new Date(obj[k]);
      }
    }
  }
};

const getIGMessageFiles = (dirPath = "./messageFiles") => {
  const files = fs.readdirSync(dirPath);
  return files.filter((file) => file.endsWith(".html") && file.includes("message"));
};

const loadDomFromHtml = (filepath) => {
  let html;

  try {
    html = fs.readFileSync(filepath, "utf8");
  } catch {
    return null;
  }

  return new JSDOM(html);
};

const getTimeFromString = (timeStr) => {
  const [num, unit] = timeStr.split(" ");
  if (unit === "minute" || unit === "minutes") {
    return num * 60;
  }
  return parseInt(num, 10);
};

const getShortDate = (dateObj) => {
  const date = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based in JavaScript
  const year = dateObj.getFullYear();
  return `${date}/${month}/${year}`;
};

const formatTimeSeconds = (seconds) => {
  let formattedString = "";

  if (seconds < 60) {
    formattedString = `${seconds} second${seconds !== 1 ? "s" : ""}`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    formattedString = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    formattedString = `${hours} hour${hours !== 1 ? "s" : ""}`;

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      formattedString += ` (${days} day${
        days !== 1 ? "s" : ""
      } ${remainingHours} hour${remainingHours !== 1 ? "s" : ""})`;
    }
  }

  return formattedString;
};

const getDaysInMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

module.exports = {
  convertDateStrings,
  getIGMessageFiles,
  loadDomFromHtml,
  getTimeFromString,
  getShortDate,
  formatTimeSeconds,
  getDaysInMonth,
};
