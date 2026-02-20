const { getShortDate, formatTimeSeconds } = require("./utils");

const statColour = "\x1b[92m";
// const altStatColour = "\x1b[32m";
const varStatusColour = " \x1b[33m";
const varWhite = "\x1b[37m";

const logTopLevelStatics = ({
  messageCount,
  totalDuration,
  callCount,
  reelCount,
  reactionCount,
}) => {
  console.log(statColour, `Total text:`, messageCount);
  console.log(
    statColour,
    `Total call time:${varStatusColour}`,
    formatTimeSeconds(totalDuration)
  );
  console.log(statColour, "Number of calls:", callCount);
  console.log(statColour, "Number of reels:", reelCount);
  console.log(statColour, "Number of reactions:", reactionCount);
};

const logLoadInfo = (count, startDate, endDate) => {
  const fmtStartDate = getShortDate(startDate);
  const fmtEndDate = getShortDate(endDate);

  const countStr = `Found a total of${varStatusColour}${count}${varWhite} message records`;
  const dateStr = `between the dates${varStatusColour}${fmtStartDate}${varWhite}, and${varStatusColour}${fmtEndDate}${varWhite}.`;
  console.log(`${countStr} ${dateStr}`);
};

module.exports = { logLoadInfo, logTopLevelStatics };
