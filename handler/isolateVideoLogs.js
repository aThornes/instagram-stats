const fs = require("fs");
const { loadDomFromHtml } = require("../helper/utils");

/**
 * Isolates video chat logs from an Instagram message HTML file.
 * Creates a new HTML file containing only "started a video chat" and "Video chat ended" entries.
 */
const isolateVideoLogs = (filepath, outpath) => {
  const dom = loadDomFromHtml(filepath);

  if (!dom) {
    console.log(`  Skipping ${filepath} - could not read file`);
    return;
  }

  const document = dom.window.document;

  // Find all video chat related divs
  const videoChatDivs = Array.from(document.querySelectorAll("div")).filter(
    (div) =>
      div.classList.contains("pam") &&
      (div.textContent.includes("started a video chat") ||
        div.textContent.includes("Video chat ended"))
  );

  if (videoChatDivs.length === 0) {
    console.log(`  Skipping ${filepath} - no video chat entries found`);
    return;
  }

  // Try to find a main container, fall back to body if not found
  let mainDiv = document.querySelector('div[role="main"]');
  
  if (!mainDiv) {
    // Try alternative selectors that Instagram exports might use
    mainDiv = document.querySelector("div._a6-g") || 
              document.querySelector("div.pam")?.parentElement ||
              document.body;
  }

  if (!mainDiv) {
    console.log(`  Skipping ${filepath} - could not find main container`);
    return;
  }

  // Clear the main div content
  while (mainDiv.firstChild) {
    mainDiv.removeChild(mainDiv.lastChild);
  }

  // Add only video chat divs
  videoChatDivs.forEach((div) => mainDiv.appendChild(div.cloneNode(true)));

  const newHtml = dom.serialize();

  fs.writeFileSync(outpath, newHtml, "utf8");
  console.log(`  ✓ Isolated ${videoChatDivs.length} video chat entries to ${outpath}`);
};

module.exports = { isolateVideoLogs };
