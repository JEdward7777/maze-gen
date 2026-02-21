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

  // Return result
  return {
    groups: Object.values(dict_groups)
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
