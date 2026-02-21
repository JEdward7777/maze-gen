#!/usr/bin/env node

/**
 * Analyze a maze file and output disconnected spaces as JSON
 * Usage: node scripts/analyze-maze.js <maze-file>
 */

const fs = require('fs');
const path = require('path');

/**
 * Analyze a maze and return disconnected spaces
 * @param {string} mazePath - Path to the maze JSON file
 * @returns {object} Analysis result with spaces
 */
function analyzeMaze(mazePath) {
  const maze = JSON.parse(fs.readFileSync(mazePath, 'utf8'));

  // Build adjacency list from links
  const adjacency = new Map();

  // Initialize all cells
  const cells = Object.keys(maze.cells);
  cells.forEach(cell => {
    if (!adjacency.has(cell)) {
      adjacency.set(cell, new Set());
    }
  });

  // Add edges from links (bidirectional)
  Object.keys(maze.links).forEach(link => {
    const [cell1, cell2] = link.split('-');
    if (adjacency.has(cell1) && adjacency.has(cell2)) {
      adjacency.get(cell1).add(cell2);
      adjacency.get(cell2).add(cell1);
    }
  });

  // Find connected components using BFS
  const visited = new Set();
  const spaces = [];

  cells.forEach(startCell => {
    if (visited.has(startCell)) return;
    
    // BFS from this cell
    const component = [];
    const queue = [startCell];
    visited.add(startCell);
    
    while (queue.length > 0) {
      const current = queue.shift();
      component.push(current);
      
      const neighbors = adjacency.get(current) || new Set();
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    
    spaces.push({
      cells: component,
      area: component.length
    });
  });

  // Return result
  return {
    maze: path.basename(mazePath),
    totalSpaces: spaces.length,
    spaces: spaces.map((space, index) => ({
      id: index + 1,
      area: space.area,
      cells: space.cells
    }))
  };
}

// Run if executed directly
if (require.main === module) {
  const mazeFile = process.argv[2];
  if (!mazeFile) {
    console.error('Usage: node scripts/analyze-maze.js <maze-file>');
    process.exit(1);
  }

  const mazePath = path.resolve(mazeFile);
  if (!fs.existsSync(mazePath)) {
    console.error(`Error: File not found: ${mazePath}`);
    process.exit(1);
  }

  const result = analyzeMaze(mazePath);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = analyzeMaze;
