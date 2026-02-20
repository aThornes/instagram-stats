const fs = require("fs");
const { getIGMessageFiles } = require("./helper/utils");
const { isolateVideoLogs } = require("./handler/isolateVideoLogs");
const {
  getStatsData,
  getTopLevelStats,
  getYearsWithData,
} = require("./handler/generateLogStatistics");
const {
  generateAllTimeSummary,
  generateYearlyBarChart,
} = require("./handler/generateStatsGraph");
const { logTopLevelStatics, logLoadInfo } = require("./helper/log");

const VIDEO_DIR = "./isolatedVideoLogs";
const MESSAGE_DIR = "./messageFiles";

const videoLogIsolation = () => {
  const messageFiles = getIGMessageFiles(MESSAGE_DIR);

  /* Wipe any existing since we want to overwrite */
  if (fs.existsSync(VIDEO_DIR)) fs.rmSync(VIDEO_DIR, { recursive: true });

  fs.mkdirSync(VIDEO_DIR);

  messageFiles.forEach((file) => {
    isolateVideoLogs(`./messageFiles/${file}`, `${VIDEO_DIR}/${file}`);
  });
};

const statsGeneration = () => {
  // Get aggregated stats - uses batch processing to avoid memory issues
  const { monthlyStats, startDate, endDate, totalMessageCount } = getStatsData();
  
  if (!monthlyStats || Object.keys(monthlyStats).length === 0) {
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Error: ",
      "Unable to find any messages. Ensure messageFiles directory is populated."
    );
    return;
  }

  /* Log basic load complete info */
  logLoadInfo(totalMessageCount, startDate, endDate);

  /* Create stats directory */
  if (!fs.existsSync("stats")) fs.mkdirSync("stats");

  /* Generate all-time summary */
  console.log("\nGenerating all-time summary...");
  const summaryImg = generateAllTimeSummary(monthlyStats, startDate, endDate);
  fs.writeFileSync("stats/all_time_summary.png", summaryImg);
  console.log("  ✓ Created stats/all_time_summary.png");

  /* Get unique years from aggregated data */
  const years = getYearsWithData(monthlyStats);

  /* Generate yearly bar charts */
  console.log(`\nGenerating yearly charts for ${years.length} year(s)...`);
  years.forEach((year, index) => {
    console.log(`  [${index + 1}/${years.length}] Generating ${year}...`);
    const yearImg = generateYearlyBarChart(monthlyStats, year);
    fs.writeFileSync(`stats/${year}_yearly.png`, yearImg);
    console.log(`    ✓ Created stats/${year}_yearly.png`);
  });

  /* Write out top level statistics to console */
  console.log("\n--- Summary ---");
  const topLevelStats = getTopLevelStats(monthlyStats);
  logTopLevelStatics(topLevelStats);

  console.log("\n✓ Stats generation complete!");
};

module.exports = { videoLogIsolation, statsGeneration };
