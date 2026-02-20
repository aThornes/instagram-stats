const { createCanvas } = require("@napi-rs/canvas");

const canvasWidth = 1200;
const canvasHeight = 800;

const initialiseCanvas = (width = canvasWidth, height = canvasHeight) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  return { canvas, ctx };
};

const drawText = (ctx, text, x, y, font, color, align = "left", baseline = "alphabetic") => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
};

const drawCircle = (ctx, x, y, radius, color) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
};

const drawBar = (ctx, x, y, width, height, color, radius = 4) => {
  if (height < 1) return;
  
  ctx.beginPath();
  ctx.fillStyle = color;
  
  // Draw rounded top corners only
  if (height < radius * 2) {
    ctx.fillRect(x, y, width, height);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
};

const drawLine = (ctx, x1, y1, x2, y2, color, lineWidth = 1) => {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

const drawLegend = (ctx, items, x, y, spacing = 120) => {
  items.forEach((item, index) => {
    const itemX = x + index * spacing;
    
    // Draw color box
    ctx.fillStyle = item.color;
    ctx.fillRect(itemX, y - 10, 16, 16);
    
    // Draw label
    drawText(ctx, item.label, itemX + 22, y + 2, "14px Arial", "#ffffff", "left");
  });
};

const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
};

const drawRoundedRect = (ctx, x, y, width, height, radius, colour) =>
  drawRoundedRectLogic(ctx, x, y, width, height, radius, colour, true, true);

const drawRoundedRectTop = (ctx, x, y, width, height, radius, colour) =>
  drawRoundedRectLogic(ctx, x, y, width, height, radius, colour, false, true);

const drawRoundedRectBottom = (ctx, x, y, width, height, radius, colour) =>
  drawRoundedRectLogic(ctx, x, y, width, height, radius, colour, true, false);

const drawRectangle = (ctx, x, y, width, height, colour) =>
  drawRoundedRectLogic(ctx, x, y, width, height, 0, colour, false, false);

const drawRoundedRectLogic = (
  ctx,
  x,
  y,
  width,
  height,
  radius,
  colour,
  curveBottom,
  curveTop
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);

  if (curveTop) {
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  } else {
    ctx.lineTo(x + width, y);
  }

  ctx.lineTo(x + width, y + height - radius);

  if (curveBottom) {
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  } else {
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
  }

  ctx.lineTo(x, y + radius);

  if (curveTop) {
    ctx.quadraticCurveTo(x, y, x + radius, y);
  } else {
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
};

module.exports = {
  canvasWidth,
  canvasHeight,
  initialiseCanvas,
  drawText,
  drawCircle,
  drawBar,
  drawLine,
  drawLegend,
  formatNumber,
  drawRoundedRect,
  drawRoundedRectTop,
  drawRoundedRectBottom,
  drawRectangle,
};
