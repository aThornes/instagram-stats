const { videoLogIsolation, statsGeneration } = require("./main");
const fs = require("fs");

const args = process.argv.slice(2);

let type;
for (let i = 0; i < args.length; i++) {
  const argHeader = args[i];
  switch (argHeader) {
    case "--type":
    case "-t":
      if (args.length <= i + 1)
        throw new Error("Type must be provided. Run with --type <video|stats>");
      const val = args[i + 1].toLowerCase();
      if (val === "video") {
        type = "video";
      } else if (val === "stats" || val === "statistics") {
        type = "stats";
      }
      i++;
      break;
    case "--nocache":
    case "--clearcache":
      console.log("Clearing cache...");
      if (fs.existsSync("cache")) fs.rmSync("cache", { recursive: true });
      break;
  }
}

if (!type) {
  throw new Error("Type must be provided. Run with --type <video|stats>");
}

if (type === "video") {
  videoLogIsolation();
} else if (type === "stats") {
  statsGeneration();
}
