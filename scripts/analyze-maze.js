#!/usr/bin/env node

/**
 * Analyze a maze file and output disconnected spaces as JSON
 * Usage: node scripts/analyze-maze.js <maze-file>
 */

const fs = require('fs');
const path = require('path');

/**
 * Analyze a maze and return disconnected spaces
 * @param {string|object} mazeInput - Path to the maze JSON file or maze object
 * @returns {object} Analysis result with spaces
 */
function analyzeMaze(mazeInput) {
  // Load maze from file if string path provided
  const maze = typeof mazeInput === 'string' 
    ? JSON.parse(fs.readFileSync(mazeInput, 'utf8')) 
    : mazeInput;

  const leader = {};

  const get_leader = (cell) => {
    if (leader[cell] === undefined) return cell;
    if (leader[cell] == cell) return cell;
    leader[cell] = get_leader(leader[cell]);
    return leader[cell];
  }


  const connect_cells = (cellA, cellB) => {
    leader[get_leader(cellA)] = get_leader(cellB);
  }


  // Add edges from links (bidirectional)
  Object.keys(maze.links).forEach(link => {
    const [cell1, cell2] = link.split('-');
    connect_cells(cell1, cell2);
  });

  //make groups a dictionary of leader to array.
  const dict_groups = {};

  //now make sure all the cells have been touched even if they are not connected.
  Object.keys(maze.cells).forEach(cell => {
    const cell_leader = get_leader(cell);
    if (!dict_groups[cell_leader]) {
      dict_groups[cell_leader] = [];
    }
    dict_groups[cell_leader].push(cell);
  });

  //Now determine the boundaries between the groups.
  const boundaries = [];
  for( const cell of Object.keys(maze.cells) ){
    const [x, y] = cell.split(',');
    const down = `${x},${parseInt(y)+1}`;
    const right = `${parseInt(x)+1},${y}`;
    const neighbors = [down, right];
    const cell_leader = get_leader(cell);

    // Check if any neighbor is in a different group
    neighbors.forEach(neighbor => {
      if (maze.cells[neighbor] && get_leader(neighbor) !== cell_leader) {
        boundaries.push(`${cell}-${neighbor}`);
      }
    });
  }

  // Return result
  return {
    groups: Object.values(dict_groups),
    boundaries: boundaries
  };
}

/**
 * Solve a maze and return the shortest path from start to end
 * Uses BFS (Breadth-First Search) to find shortest path
 * @param {string|object} mazeInput - Path to the maze JSON file or maze object
 * @returns {object} Solution result with path and stats
 */
function solveMaze(mazeInput) {
  // Load maze from file if string path provided
  const maze = typeof mazeInput === 'string' 
    ? JSON.parse(fs.readFileSync(mazeInput, 'utf8')) 
    : mazeInput;

  const { start, end, cells, links } = maze;
  
  // Validate start and end exist
  if (!start || !cells[start]) {
    return { error: 'Start cell not found in maze' };
  }
  if (!end || !cells[end]) {
    return { error: 'End cell not found in maze' };
  }

  // Build adjacency list from links
  const adjacency = new Map();
  
  // Initialize all cells
  Object.keys(cells).forEach(cell => {
    adjacency.set(cell, []);
  });
  
  // Add edges from links (bidirectional)
  Object.keys(links).forEach(link => {
    const [cell1, cell2] = link.split('-');
    if (adjacency.has(cell1) && adjacency.has(cell2)) {
      adjacency.get(cell1).push(cell2);
      adjacency.get(cell2).push(cell1);
    }
  });

  // BFS to find shortest path
  const visited = new Set();
  const queue = [[start]];  // Queue of paths
  visited.add(start);
  
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    
    // Found the end
    if (current === end) {
      return {
        path: path,
        length: path.length,
        solved: true
      };
    }
    
    // Explore neighbors
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  
  // No path found
  return {
    path: [],
    length: 0,
    solved: false,
    error: 'No path from start to end'
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

module.exports = { analyzeMaze, solveMaze };
