#!/usr/bin/env node

/**
 * Generate a random maze
 * Usage: node scripts/generate-maze.js <width> <height> <output-file>
 */

const fs = require('fs');
const path = require('path');
const { analyzeMaze, solveMaze } = require('./analyze-maze');
const { Random } = require('./random');

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
 * @param {number[]} [options.seedPacket] - Array of seeds; one popped per loop iteration to reseed RNG
 * @returns {object} Maze object (may not be fully connected if maxIterations reached)
 */
function generateRandomMaze({ width, height, initialMaze, talk = false, maxIterations = Infinity, seedPacket }) {

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

  // Initialize seed queue and RNG
  let seedQueue = seedPacket ? [...seedPacket] : [];
  let rng = () => Math.random();

  // Iteratively add links until maze is connected or max iterations reached
  while (analysis.boundaries.length > 0 && iterations < maxIterations) {
    // Reseed RNG if seed packet has elements
    if (seedQueue.length > 0) {
      const seed = seedQueue.pop();
      const randomInstance = new Random(seed);
      rng = () => randomInstance.random();
    }

    // Pick a random boundary from the analysis
    const randomIndex = Math.floor(rng() * analysis.boundaries.length);
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

/**
 * Generate a maze optimized for maximum path length from start to end
 * @param {object} options - Options object
 * @param {number} options.width - Number of columns
 * @param {number} options.height - Number of rows
 * @param {number} [options.iterations=100] - Number of iterations per seed optimization
 * @param {number} [options.divisions=10] - Number of divisions for outer loop stepping
 * @param {boolean} [options.talk=false] - Whether to print progress messages
 * @returns {object} Result with best maze, length, and seedPacket
 */
function generateLongMaze({ width, height, iterations = 100, divisions = 10, talk = false }) {
  const seedPacketLength = width * height;
  let seedPacket = Array.from({ length: seedPacketLength }, () => Math.floor(Math.random() * 1000000));
  let bestSeedPacket = [...seedPacket];
  let bestLength = 0;
  let bestMaze = null;

  const step = Math.round(seedPacketLength / divisions);
  for (let i = 0; i < seedPacketLength; i += step) {
    for (let iter = 0; iter < iterations; iter++) {
      seedPacket[i]++;
      const result = generateRandomMaze({ width, height, seedPacket: [...seedPacket], talk });
      const maze = result.maze;
      const solution = solveMaze(maze);
      if (solution.solved && solution.length > bestLength) {
        bestLength = solution.length;
        bestMaze = JSON.parse(JSON.stringify(maze)); // deep copy
        bestSeedPacket = [...seedPacket];
      }
    }
  }

  return { maze: bestMaze, length: bestLength, seedPacket: bestSeedPacket };
}

module.exports = { generateRandomMaze, addLink, generateLongMaze };
