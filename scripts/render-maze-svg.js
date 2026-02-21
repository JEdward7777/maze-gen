#!/usr/bin/env node

/**
 * Render a maze to SVG
 * Usage: node scripts/render-maze-svg.js <maze-file> [output-file]
 * If no output file, prints to stdout
 */

const fs = require('fs');
const path = require('path');

/**
 * Render a maze to SVG string
 * @param {object} maze - The maze object
 * @param {object} options - Rendering options
 * @param {number} options.cellSize - Size of each cell in pixels (default: 20)
 * @param {number} options.lineWidth - Width of walls in pixels (default: 2)
 * @returns {string} SVG string
 */
function renderMazeToSVG(maze, options = {}) {
  const {
    cellSize = 20,
    lineWidth = 2,
    startColor = '#4CAF50',
    endColor = '#F44336',
    wallColor = '#333333',
    backgroundColor = '#FFFFFF'
  } = options;

  const { width, height, cells, links, start, end } = maze;
  
  // Calculate SVG dimensions
  const svgWidth = width * cellSize;
  const svgHeight = height * cellSize;
  
  // Build a set of all links for quick lookup
  const linkSet = new Set(Object.keys(links));
  
  // Helper to check if a link exists between two cells
  const hasLink = (cellA, cellB) => {
    return linkSet.has(`${cellA}-${cellB}`) || linkSet.has(`${cellB}-${cellA}`);
  };
  
  // Generate wall lines - draw walls where there's NO link
  const walls = [];
  
  // Get all valid neighbors for each cell
  Object.keys(cells).forEach(cell => {
    const [x, y] = cell.split(',').map(Number);
    
    // Check right neighbor
    const right = `${x + 1},${y}`;
    if (cells[right] && !hasLink(cell, right)) {
      walls.push({
        x1: (x + 1) * cellSize,
        y1: y * cellSize,
        x2: (x + 1) * cellSize,
        y2: (y + 1) * cellSize
      });
    }
    
    // Check bottom neighbor
    const bottom = `${x},${y + 1}`;
    if (cells[bottom] && !hasLink(cell, bottom)) {
      walls.push({
        x1: x * cellSize,
        y1: (y + 1) * cellSize,
        x2: (x + 1) * cellSize,
        y2: (y + 1) * cellSize
      });
    }
    
    // Also draw outer boundary walls
    // Left edge
    if (x === 0 && !hasLink(cell, `${x - 1},${y}`)) {
      walls.push({
        x1: x * cellSize,
        y1: y * cellSize,
        x2: x * cellSize,
        y2: (y + 1) * cellSize
      });
    }
    // Top edge
    if (y === 0 && !hasLink(cell, `${x},${y - 1}`)) {
      walls.push({
        x1: x * cellSize,
        y1: y * cellSize,
        x2: (x + 1) * cellSize,
        y2: y * cellSize
      });
    }
    // Right edge (only for rightmost cells)
    if (x === width - 1 && !hasLink(cell, `${x + 1},${y}`)) {
      walls.push({
        x1: (x + 1) * cellSize,
        y1: y * cellSize,
        x2: (x + 1) * cellSize,
        y2: (y + 1) * cellSize
      });
    }
    // Bottom edge (only for bottom cells)
    if (y === height - 1 && !hasLink(cell, `${x},${y + 1}`)) {
      walls.push({
        x1: x * cellSize,
        y1: (y + 1) * cellSize,
        x2: (x + 1) * cellSize,
        y2: (y + 1) * cellSize
      });
    }
  });
  
  // Generate SVG
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="${backgroundColor}"/>
  
  <!-- Walls -->\n`;
  
  walls.forEach(wall => {
    svg += `  <line x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}" stroke="${wallColor}" stroke-width="${lineWidth}" stroke-linecap="square"/>\n`;
  });
  
  // Add start marker
  if (start && cells[start]) {
    const [sx, sy] = start.split(',').map(Number);
    const cx = sx * cellSize + cellSize / 2;
    const cy = sy * cellSize + cellSize / 2;
    svg += `  
  <!-- Start -->
  <circle cx="${cx}" cy="${cy}" r="${cellSize / 3}" fill="${startColor}"/>
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${cellSize / 3}" fill="white" font-family="Arial">S</text>\n`;
  }
  
  // Add end marker
  if (end && cells[end]) {
    const [ex, ey] = end.split(',').map(Number);
    const cx = ex * cellSize + cellSize / 2;
    const cy = ey * cellSize + cellSize / 2;
    svg += `  
  <!-- End -->
  <circle cx="${cx}" cy="${cy}" r="${cellSize / 3}" fill="${endColor}"/>
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="${cellSize / 3}" fill="white" font-family="Arial">E</text>\n`;
  }
  
  svg += `</svg>`;
  
  return svg;
}

/**
 * Render a maze file to SVG
 * @param {string} mazePath - Path to maze JSON file
 * @param {string} outputPath - Path to output SVG file (optional)
 * @param {object} options - Rendering options
 * @returns {string} SVG string
 */
function renderMazeFileToSVG(mazePath, outputPath, options = {}) {
  const maze = JSON.parse(fs.readFileSync(mazePath, 'utf8'));
  const svg = renderMazeToSVG(maze, options);
  
  if (outputPath) {
    fs.writeFileSync(outputPath, svg);
    console.log(`SVG saved to: ${outputPath}`);
  }
  
  return svg;
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node scripts/render-maze-svg.js <maze-file> [output-file]');
    console.error('Example: node scripts/render-maze-svg.js mazes/grid.json mazes/grid.svg');
    process.exit(1);
  }
  
  const mazePath = args[0];
  const outputPath = args[1];
  
  const mazePathResolved = path.resolve(mazePath);
  if (!fs.existsSync(mazePathResolved)) {
    console.error(`Error: File not found: ${mazePathResolved}`);
    process.exit(1);
  }
  
  renderMazeFileToSVG(mazePathResolved, outputPath);
}

module.exports = { renderMazeToSVG, renderMazeFileToSVG };
