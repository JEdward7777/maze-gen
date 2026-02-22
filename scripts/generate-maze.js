#!/usr/bin/env node

/**
 * Generate a random maze
 * Usage: node scripts/generate-maze.js <width> <height> <output-file>
 */

const fs = require('fs');
const path = require('path');
const { analyzeMaze } = require('./analyze-maze');

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
 * @param {object} options - Options object
 * @param {number} [options.width] - Number of columns (required if no initialMaze)
 * @param {number} [options.height] - Number of rows (required if no initialMaze)
 * @param {object} [options.initialMaze] - Starting maze to build upon (optional)
 * @param {boolean} [options.talk=false] - Whether to print progress messages
 * @param {number} [options.maxIterations=Infinity] - Maximum iterations to run
 * @returns {object} Maze object (may not be fully connected if maxIterations reached)
 */
function generateRandomMaze({ width, height, initialMaze, talk = false, maxIterations = Infinity }) {

  // Use provided maze or create new one
  let maze;
  if (initialMaze) {
    // Deep copy the initial maze to avoid mutating the original
    maze = JSON.parse(JSON.stringify(initialMaze));
    width = maze.width;
    height = maze.height;
  } else {
    // Initialize maze with all cells and no links
    maze = {
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
  }

  // Get initial boundary count for progress calculation
  let analysis = analyzeMaze(maze);
  const totalBoundaries = analysis.boundaries.length;
  const startTime = Date.now();
  let lastPrint = 0;
  let iterations = 0;

  // Iteratively add links until maze is connected or max iterations reached
  while (analysis.boundaries.length > 0 && iterations < maxIterations) {
    // Pick a random boundary from the analysis
    const randomIndex = Math.floor(Math.random() * analysis.boundaries.length);
    const boundary = analysis.boundaries[randomIndex];

    // Parse the boundary (format: "cellA-cellB")
    const [cellA, cellB] = boundary.split('-');

    // Add the link
    addLink(maze, cellA, cellB);
    iterations++;

    // Re-analyze
    analysis = analyzeMaze(maze);

    // Print progress if talk is enabled (throttled to once per second)
    if (talk) {
      const now = Date.now();
      if (!lastPrint || now - lastPrint >= 1000 || analysis.boundaries.length === 0) {
        const remaining = analysis.boundaries.length;
        const percentComplete = ((totalBoundaries - remaining) / totalBoundaries * 100).toFixed(1);
        const elapsed = now - startTime;
        const rate = (totalBoundaries - remaining) / elapsed; // links per ms
        const remainingMs = remaining / rate;
        const estimatedEnd = new Date(now + remainingMs);

        console.log(`${percentComplete}% complete | ${remaining} boundaries remaining | ETA: ${estimatedEnd.toLocaleTimeString()}`);
        lastPrint = now;
      }
    }
  }

  return {
    maze,
    completed: analysis.boundaries.length === 0,
    iterations
  };
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
  const result = generateRandomMaze({ width, height, talk: true });
  const maze = result.maze;

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

module.exports = { generateRandomMaze, addLink };
