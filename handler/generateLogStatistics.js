const {
  getTimeFromString,
  getIGMessageFiles,
} = require("../helper/utils");

const fs = require("fs");

const MESSAGE_DIR = "./messageFiles";
const MIN_DURATION = 60;
const TIMEZONE_OFFSET_HOURS = parseInt(process.env.IG_TIMEZONE_OFFSET || "8", 10);

/**
 * Lightweight regex-based parser to extract message data from HTML
 * Avoids JSDOM memory overhead by using string operations
 */
const parseMessageFromHtml = (messageBlock) => {
  // Extract sender from h2 tag
  const senderMatch = messageBlock.match(/<h2[^>]*>([^<]+)<\/h2>/);
  const sender = senderMatch ? decodeHtmlEntities(senderMatch[1]) : "";

  // Extract content from _a6-p div
  const contentMatch = messageBlock.match(/<div class="_3-95 _a6-p">([\s\S]*?)<\/div><div class="_3-94 _a6-o">/);
  let content = "";
  if (contentMatch) {
    content = contentMatch[1].replace(/<[^>]+>/g, " ").trim();
    content = decodeHtmlEntities(content);
  }

  // Extract date from _a6-o div
  const dateMatch = messageBlock.match(/<div class="_3-94 _a6-o">([^<]+)<\/div>/);
  let dateObj = null;
  if (dateMatch) {
    try {
      dateObj = new Date(dateMatch[1]);
      dateObj.setHours(dateObj.getHours() + TIMEZONE_OFFSET_HOURS);
    } catch {
      dateObj = null;
    }
  }

  // Categorize the message
  const isReaction = content.includes("Reacted") && content.includes("to your message");
  const isReel = content.includes("instagram.com/reel");
  const isMedia = content.includes("sent an attachment");
  const isCallStart = content.includes("started a video chat");
  const isCallEnd = content.includes("Video chat ended");

  // Extract call duration if present
  let duration = null;
  const durationMatch = messageBlock.match(/Duration:\s*(\d+)\s*(minute|minutes|hour|hours|second|seconds)/i);
  if (durationMatch) {
    const num = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith("hour")) {
      duration = num * 3600;
    } else if (unit.startsWith("minute")) {
      duration = num * 60;
    } else {
      duration = num;
    }
  }

  return {
    sender,
    contentLength: content.length,
    dateTime: dateObj,
    isReaction,
    isReel,
    isMedia: isMedia && !isReel,
    isCallStart,
    isCallEnd,
    duration,
  };
};

/**
 * Decode common HTML entities
 */
const decodeHtmlEntities = (str) => {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#064;/g, "@")
    .replace(/&nbsp;/g, " ");
};

/**
 * Process a single file using streaming/regex approach
 * Reads the file and processes message blocks without creating a full DOM
 */
const processFileToMonthlyStats = (filepath) => {
  // Read file content as string
  let html;
  try {
    html = fs.readFileSync(filepath, "utf8");
  } catch (err) {
    throw new Error(`Could not read file: ${filepath}`);
  }

  // Split into message blocks by finding each pam div
  // Using a simpler approach: find all message divs
  const messageBlocks = [];
  const pamRegex = /<div class="pam [^"]*">([\s\S]*?)<div class="_3-94 _a6-o">[^<]+<\/div><\/div>/g;
  let match;
  while ((match = pamRegex.exec(html)) !== null) {
    messageBlocks.push(match[0]);
  }

  // Clear HTML from memory after splitting
  html = null;

  // Aggregate stats by month key (year-month)
  const monthlyStats = {};
  let earliestDate = null;
  let latestDate = null;
  let totalMessages = 0;

  // Track recent call starts for filtering short calls
  const recentCallStarts = [];

  for (const block of messageBlocks) {
    const msgStats = parseMessageFromHtml(block);

    if (
      msgStats.isCallEnd &&
      (!msgStats.duration || msgStats.duration < MIN_DURATION)
    ) {
      // Short call - remove any tracked call start
      for (let i = recentCallStarts.length - 1; i >= 0; i--) {
        const callStart = recentCallStarts[i];
        const key = `${callStart.year}-${callStart.month}`;
        if (monthlyStats[key]) {
          monthlyStats[key].callStarts--;
        }
        recentCallStarts.splice(i, 1);
        break;
      }
      continue;
    }

    if (!msgStats.dateTime) continue;

    const year = msgStats.dateTime.getFullYear();
    const month = msgStats.dateTime.getMonth();
    const key = `${year}-${month}`;

    // Update date bounds
    if (!earliestDate || msgStats.dateTime < earliestDate) {
      earliestDate = msgStats.dateTime;
    }
    if (!latestDate || msgStats.dateTime > latestDate) {
      latestDate = msgStats.dateTime;
    }

    // Initialize month stats if needed
    if (!monthlyStats[key]) {
      monthlyStats[key] = {
        year,
        month,
        messages: 0,
        reels: 0,
        reactions: 0,
        callMinutes: 0,
        callCount: 0,
        callStarts: 0,
        totalContentLength: 0,
      };
    }

    totalMessages++;

    // Categorize and count
    if (msgStats.isReaction) {
      monthlyStats[key].reactions++;
    } else if (msgStats.isReel) {
      monthlyStats[key].reels++;
    } else if (msgStats.isCallStart) {
      monthlyStats[key].callStarts++;
      recentCallStarts.push({ year, month });
      if (recentCallStarts.length > 10) recentCallStarts.shift();
    } else if (msgStats.isCallEnd) {
      monthlyStats[key].callCount++;
      monthlyStats[key].callMinutes += (msgStats.duration || 0) / 60;
    } else {
      monthlyStats[key].messages++;
      monthlyStats[key].totalContentLength += msgStats.contentLength;
    }
  }

  return { monthlyStats, earliestDate, latestDate, totalMessages };
};

/**
 * Merge monthly stats from multiple files
 */
const mergeMonthlyStats = (target, source) => {
  for (const key in source) {
    if (!target[key]) {
      target[key] = { ...source[key] };
    } else {
      target[key].messages += source[key].messages;
      target[key].reels += source[key].reels;
      target[key].reactions += source[key].reactions;
      target[key].callMinutes += source[key].callMinutes;
      target[key].callCount += source[key].callCount;
      target[key].callStarts += source[key].callStarts;
      target[key].totalContentLength += source[key].totalContentLength;
    }
  }
};

/**
 * Get aggregated stats data using batch processing with lightweight parsing
 * Only stores monthly aggregates, not individual messages
 */
const getStatsData = () => {
  if (fs.existsSync("cache/aggregatedStats.json")) {
    console.log("Loading cached aggregated stats...");
    const cached = JSON.parse(
      fs.readFileSync("cache/aggregatedStats.json", "utf8")
    );
    cached.startDate = new Date(cached.startDate);
    cached.endDate = new Date(cached.endDate);
    return cached;
  }

  const messageFiles = getIGMessageFiles(MESSAGE_DIR);
  console.log(`Processing ${messageFiles.length} message files...`);

  // Aggregated data across all files
  const aggregatedMonthlyStats = {};
  let startDate = null;
  let endDate = null;
  let totalMessageCount = 0;

  // Process files one at a time
  messageFiles.forEach((file, index) => {
    console.log(`  [${index + 1}/${messageFiles.length}] Processing ${file}...`);
    
    try {
      const { monthlyStats, earliestDate, latestDate, totalMessages } = 
        processFileToMonthlyStats(`./messageFiles/${file}`);

      // Merge stats
      mergeMonthlyStats(aggregatedMonthlyStats, monthlyStats);
      totalMessageCount += totalMessages;

      // Update date bounds
      if (!startDate || earliestDate < startDate) startDate = earliestDate;
      if (!endDate || latestDate > endDate) endDate = latestDate;

      console.log(`    Found ${totalMessages} messages`);
    } catch (err) {
      console.error(`    Error processing ${file}:`, err.message);
    }
  });

  console.log(`\nTotal messages processed: ${totalMessageCount}`);

  // Log year-by-year stats
  const yearCounts = {};
  for (const key in aggregatedMonthlyStats) {
    const stat = aggregatedMonthlyStats[key];
    const total = stat.messages + stat.reels + stat.reactions + stat.callCount;
    yearCounts[stat.year] = (yearCounts[stat.year] || 0) + total;
  }
  console.log(`\nMessages by year:`);
  Object.keys(yearCounts).sort().forEach((year) => {
    console.log(`  ${year}: ${yearCounts[year]} messages`);
  });

  const statsData = {
    monthlyStats: aggregatedMonthlyStats,
    startDate,
    endDate,
    totalMessageCount,
  };

  // Cache the aggregated stats
  if (!fs.existsSync("cache")) fs.mkdirSync("cache");
  fs.writeFileSync("cache/aggregatedStats.json", JSON.stringify(statsData), "utf8");
  console.log("\nCached aggregated stats to cache/aggregatedStats.json");

  return statsData;
};

/**
 * Legacy function - kept for compatibility
 */
const separateMonths = (statsArr) => {
  console.warn("separateMonths is deprecated - use monthlyStats from getStatsData() directly");
  return {};
};

/**
 * Get top-level stats from aggregated monthly stats
 */
const getTopLevelStats = (monthlyStats) => {
  let messageCount = 0;
  let totalDuration = 0;
  let callCount = 0;
  let reelCount = 0;
  let reactionCount = 0;

  for (const key in monthlyStats) {
    const stat = monthlyStats[key];
    messageCount += stat.messages;
    totalDuration += stat.callMinutes * 60;
    callCount += stat.callCount;
    reelCount += stat.reels;
    reactionCount += stat.reactions;
  }

  return { messageCount, totalDuration, callCount, reelCount, reactionCount };
};

/**
 * Get years that have data
 */
const getYearsWithData = (monthlyStats) => {
  const years = new Set();
  for (const key in monthlyStats) {
    years.add(monthlyStats[key].year);
  }
  return [...years].sort();
};

module.exports = { 
  getStatsData, 
  separateMonths, 
  getTopLevelStats, 
  getYearsWithData,
  processFileToMonthlyStats 
};
