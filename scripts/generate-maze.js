#!/usr/bin/env node

/**
 * Generate a random maze
 * Usage: node scripts/generate-maze.js <width> <height> <output-file>
 */

const fs = require('fs');
const path = require('path');
const analyzeMaze = require('./analyze-maze');

/**
 * Get all potential neighbors (boundaries) between different groups
 * @param {object} maze - The maze object
 * @returns {array} Array of neighbor pairs [cellA, cellB]
 */
function getBoundaries(maze) {
  const boundaries = [];
  const { width, height, cells, links } = maze;
  
  // Convert cells to a set for fast lookup
  const cellSet = new Set(Object.keys(cells));
  
  // Check each cell for valid neighbors
  Object.keys(cells).forEach(cell => {
    const [x, y] = cell.split(',').map(Number);
    
    // Check right and bottom neighbors only (to avoid duplicates)
    const neighbors = [
      [x + 1, y],  // right
      [x, y + 1]  // bottom
    ];
    
    neighbors.forEach(([nx, ny]) => {
      const neighborKey = `${nx},${ny}`;
      
      // Skip if neighbor doesn't exist in cells
      if (!cellSet.has(neighborKey)) return;
      
      // Check if link already exists
      const linkKey1 = `${cell}-${neighborKey}`;
      const linkKey2 = `${neighborKey}-${cell}`;
      
      if (links[linkKey1] || links[linkKey2]) return;
      
      boundaries.push([cell, neighborKey]);
    });
  });
  
  return boundaries;
}

/**
 * Add a single link to the maze
 * @param {object} maze - The maze object (mutated)
 * @param {string} cellA - First cell coordinates "x,y"
 * @param {string} cellB - Second cell coordinates "x,y"
 */
function addLink(maze, cellA, cellB) {
  const linkKey = `${cellA}-${cellB}`;
  maze.links[linkKey] = true;
}

/**
 * Generate a random maze of given dimensions
 * @param {number} width - Number of columns
 * @param {number} height - Number of rows
 * @returns {object} Complete maze object
 */
function generateRandomMaze(width, height) {
  // Initialize maze with all cells and no links
  const maze = {
    width,
    height,
    cells: {},
    links: {},
    start: "0,0",
    end: `${width - 1},${height - 1}`
  };
  
  // Create all cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      maze.cells[`${x},${y}`] = true;
    }
  }
  
  // Iteratively add links until maze is connected
  let analysis = analyzeMaze(maze);
  
  while (analysis.groups.length > 1) {
    // Get all possible boundaries between different groups
    const boundaries = getBoundaries(maze);
    
    if (boundaries.length === 0) {
      // No more boundaries but still not connected - shouldn't happen
      break;
    }
    
    // Pick a random boundary
    const randomIndex = Math.floor(Math.random() * boundaries.length);
    const [cellA, cellB] = boundaries[randomIndex];
    
    // Add the link
    addLink(maze, cellA, cellB);
    
    // Re-analyze
    analysis = analyzeMaze(maze);
  }
  
  return maze;
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node scripts/generate-maze.js <width> <height> <output-file>');
    console.error('Example: node scripts/generate-maze.js 10 10 mazes/random-10x10.json');
    process.exit(1);
  }
  
  const [widthStr, heightStr, outputPath] = args;
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);
  
  if (isNaN(width) || isNaN(height) || width < 1 || height < 1) {
    console.error('Error: width and height must be positive integers');
    process.exit(1);
  }
  
  // Generate the maze
  const maze = generateRandomMaze(width, height);
  
  // Resolve output path
  const resolvedPath = path.resolve(outputPath);
  
  // Ensure directory exists
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Save to file
  fs.writeFileSync(resolvedPath, JSON.stringify(maze, null, 2));
  console.log(`Maze saved to: ${resolvedPath}`);
}

module.exports = { generateRandomMaze, addLink, getBoundaries };
