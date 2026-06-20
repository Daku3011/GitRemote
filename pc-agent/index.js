import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import simpleGit from 'simple-git';
import { Bonjour } from 'bonjour-service';

// Load configuration
const configPath = path.resolve('config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const PORT = config.port || 3011;
const SCAN_DIR = config.scanDir || 'C:\\Users\\rdwar\\Documents';

const app = express();
app.use(cors());
app.use(express.json());

// Generate pairing code & auth token
const PAIRING_CODE = Math.floor(1000 + Math.random() * 9000).toString();
const AUTH_TOKEN = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

console.log(`\n=============================================`);
console.log(`🚀 GitMobileToPC Server starting...`);
console.log(`📁 Scanning directory: ${SCAN_DIR}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🔑 Pairing Code: ${PAIRING_CODE}`);
console.log(`=============================================\n`);

// Helper: Scan for git repos up to 2 directories deep
function findGitRepos(dir, depth = 0, maxDepth = 2) {
  let repos = [];
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check if current directory has a .git folder
    const isGit = files.some(file => file.isDirectory() && file.name === '.git');
    if (isGit) {
      repos.push({
        id: Buffer.from(dir).toString('base64url'),
        name: path.basename(dir),
        path: dir
      });
      return repos;
    }

    if (depth < maxDepth) {
      for (const file of files) {
        if (file.isDirectory() && file.name !== 'node_modules' && !file.name.startsWith('.')) {
          repos = repos.concat(findGitRepos(path.join(dir, file.name), depth + 1, maxDepth));
        }
      }
    }
  } catch (err) {
    // Ignore inaccessible files/directories
  }
  return repos;
}

// Map repo ID back to full path
function getRepoPath(id) {
  try {
    return Buffer.from(id, 'base64url').toString('utf8');
  } catch (err) {
    return null;
  }
}

// Middleware: Bearer token verification
app.use((req, res, next) => {
  if (req.path === '/api/pair') {
    return next();
  }
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Authentication Pairing Endpoint
app.post('/api/pair', (req, res) => {
  const { code } = req.body;
  if (code && code.toString() === PAIRING_CODE) {
    res.json({ token: AUTH_TOKEN });
  } else {
    res.status(400).json({ error: 'Invalid pairing code' });
  }
});

// List all repositories
app.get('/api/workspaces', async (req, res) => {
  try {
    const repos = findGitRepos(SCAN_DIR);
    const result = [];
    
    for (const repo of repos) {
      try {
        const git = simpleGit(repo.path);
        const status = await git.status();
        result.push({
          ...repo,
          currentBranch: status.current,
          changesCount: status.files.length
        });
      } catch (err) {
        result.push({
          ...repo,
          currentBranch: 'unknown',
          changesCount: 0,
          error: 'Not a git repo or permission error'
        });
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed status of a repository
app.get('/api/workspaces/:id/status', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    const status = await git.status();
    
    // Parse staged/unstaged status
    const files = status.files.map(f => {
      const staged = f.index !== ' ' && f.index !== '?';
      let fileStatus = 'modified';
      if (f.index === '?' || f.working_dir === '?') {
        fileStatus = 'untracked';
      } else if (f.index === 'A' || f.working_dir === 'A') {
        fileStatus = 'added';
      } else if (f.index === 'D' || f.working_dir === 'D') {
        fileStatus = 'deleted';
      } else if (f.index === 'R' || f.working_dir === 'R') {
        fileStatus = 'renamed';
      }

      return {
        path: f.path,
        status: fileStatus,
        staged: staged
      };
    });

    res.json({
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      files
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch unified diff of a file
app.get('/api/workspaces/:id/diff', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  const { file, staged } = req.query;
  
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });
  if (!file) return res.status(400).json({ error: 'File path required' });

  try {
    const git = simpleGit(repoPath);
    let diffText = '';

    const status = await git.status();
    const isUntracked = status.files.some(f => f.path === file && (f.index === '?' || f.working_dir === '?'));

    if (isUntracked) {
      try {
        const fullPath = path.join(repoPath, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        diffText = content.split('\n').map(line => '+' + line).join('\n');
      } catch (err) {
        diffText = 'Binary or unreadable file content.';
      }
    } else {
      if (staged === 'true') {
        diffText = await git.diff(['--staged', '--', file]);
      } else {
        diffText = await git.diff(['--', file]);
      }
    }

    res.json({
      file,
      diff: diffText
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stage or unstage files
app.post('/api/workspaces/:id/stage', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  const { files, stage } = req.body; // stage: boolean

  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });
  if (!files || !Array.isArray(files)) return res.status(400).json({ error: 'Files array required' });

  try {
    const git = simpleGit(repoPath);
    if (stage) {
      await git.add(files);
    } else {
      await git.reset(['--', ...files]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Commit staged changes
app.post('/api/workspaces/:id/commit', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  const { message } = req.body;

  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });
  if (!message) return res.status(400).json({ error: 'Commit message required' });

  try {
    const git = simpleGit(repoPath);
    const summary = await git.commit(message);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Push changes to origin remote
app.post('/api/workspaces/:id/push', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    const status = await git.status();
    const branch = status.current;
    
    const output = await git.push('origin', branch);
    res.json({ success: true, output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});

// Advertise Bonjour/mDNS service
try {
  const bonjour = new Bonjour();
  bonjour.publish({
    name: 'GitMobileToPC Server',
    type: 'gitmobiletopc',
    port: PORT,
    txt: { version: '1.0.0' }
  });
  console.log(`📡 Bonjour mDNS advertising: 'GitMobileToPC Server' (type: gitmobiletopc, port: ${PORT})`);
} catch (err) {
  console.log(`⚠️ Failed to start Bonjour discovery advertisement: ${err.message}`);
}
