const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888;

// Serve static files from current directory
app.use(express.static('.'));

// API: Get list of available mazes
app.get('/api/mazes', (req, res) => {
  const mazesDir = path.join(__dirname, 'mazes');
  
  fs.readdir(mazesDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read mazes directory' });
    }
    
    // Filter for JSON files only
    const mazes = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(mazesDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file.replace('.json', ''),
          filename: file,
          path: `/mazes/${file}`,
          size: stats.size,
          created: stats.birthtime
        };
      });
    
    res.json({ mazes });
  });
});

// API: Get a specific maze
app.get('/api/mazes/:name', (req, res) => {
  const mazeName = req.params.name;
  const mazePath = path.join(__dirname, 'mazes', `${mazeName}.json`);
  
  fs.readFile(mazePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ error: 'Maze not found' });
    }
    
    try {
      const maze = JSON.parse(data);
      res.json(maze);
    } catch (parseErr) {
      res.status(500).json({ error: 'Invalid maze JSON' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Maze API available at http://localhost:${PORT}/api/mazes`);
});
