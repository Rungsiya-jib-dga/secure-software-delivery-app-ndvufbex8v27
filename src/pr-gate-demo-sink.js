/**
 * PR Gate workshop — new file for diff-aware Static Code Analysis only.
 */
const fs = require('fs');
const express = require('express');
const path = require('path');

const router = express.Router();
const BASE_DIR = path.join(__dirname, '..');

function isOutsideDirectory(directory, filepath) {
  const relative = path.relative(directory, filepath);
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

router.get('/read', async (req, res) => {
  const filename = req.query.file;
  if (typeof filename !== 'string' || !filename || filename.includes('\0') || path.isAbsolute(filename)) {
    return res.status(400).send('Invalid file');
  }

  const filepath = path.resolve(BASE_DIR, filename);
  if (isOutsideDirectory(BASE_DIR, filepath)) {
    return res.status(403).send('Access denied');
  }

  let data;
  try {
    const baseDirectory = await fs.promises.realpath(BASE_DIR);
    const realFilepath = await fs.promises.realpath(filepath);
    if (isOutsideDirectory(baseDirectory, realFilepath)) {
      return res.status(403).send('Access denied');
    }

    // Read the opened file, refusing a final-component symlink swap.
    const file = await fs.promises.open(realFilepath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      if (!(await file.stat()).isFile()) {
        throw new Error('Not a regular file');
      }
      data = await file.readFile('utf8');
    } finally {
      await file.close();
    }
  } catch (err) {
    return res.status(500).send('Unable to read file');
  }

  res.send(data);
});

module.exports = router;
