import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';
import { Bonjour } from 'bonjour-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const configPath = path.resolve(__dirname, 'config.json');
  try {
    if (!fs.existsSync(configPath)) {
      const defaultConfig = { port: 3011, scanDir: os.homedir() };
      console.log(`config.json not found at ${configPath}, using defaults. Create one to customize.`);
      return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to load config.json: ${err.message}`);
    process.exit(1);
  }
}

const config = loadConfig();
const PORT = config.port || 3011;
const SCAN_DIR = config.scanDir || os.homedir();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    let statusColor = '\x1b[32m'; // Green
    if (res.statusCode >= 400) statusColor = '\x1b[31m'; // Red
    else if (res.statusCode >= 300) statusColor = '\x1b[33m'; // Yellow

    console.log(
      `[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} - ${statusColor}${res.statusCode}\x1b[0m (${duration}ms)`
    );
  });
  next();
});

const PAIRING_CODE = Math.floor(1000 + Math.random() * 9000).toString();
const AUTH_TOKEN = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

console.log(`\x1b[36m=============================================\x1b[0m`);
console.log(`\x1b[1m🚀 GitMobileToPC Server starting...\x1b[0m`);
console.log(`📁 Scanning directory: \x1b[33m${SCAN_DIR}\x1b[0m`);
console.log(`🔌 Port: \x1b[32m${PORT}\x1b[0m`);
console.log(`🔑 Pairing Code: \x1b[1m\x1b[35m${PAIRING_CODE}\x1b[0m`);
console.log(`\x1b[36m=============================================\x1b[0m\n`);

async function findGitRepos(dir, depth = 0, maxDepth = 2) {
  let repos = [];
  try {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
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
      const promises = [];
      for (const file of files) {
        if (file.isDirectory() && file.name !== 'node_modules' && !file.name.startsWith('.')) {
          promises.push(findGitRepos(path.join(dir, file.name), depth + 1, maxDepth));
        }
      }
      const results = await Promise.all(promises);
      for (const result of results) {
        repos = repos.concat(result);
      }
    }
  } catch (err) {
    // Ignore inaccessible files/directories
  }
  return repos;
}

function getRepoPath(id) {
  try {
    return Buffer.from(id, 'base64url').toString('utf8');
  } catch (err) {
    return null;
  }
}

function toBool(val) {
  if (val === true || val === 'true') return true;
  if (val === false || val === 'false') return false;
  return Boolean(val);
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
    const repos = await findGitRepos(SCAN_DIR);
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
      if (toBool(staged)) {
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

// List directory entries or read file content within a workspace
app.get('/api/workspaces/:id/contents', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  const relPath = req.query.path || '';
  const targetPath = path.resolve(repoPath, relPath);

  // Prevent directory traversal attacks
  if (!targetPath.startsWith(path.resolve(repoPath))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(targetPath, { withFileTypes: true });
      const entries = files
        .filter(f => f.name !== 'node_modules' && !f.name.startsWith('.'))
        .map(f => {
          const fullFilePath = path.join(targetPath, f.name);
          let size = 0;
          try {
            if (f.isFile()) {
              size = fs.statSync(fullFilePath).size;
            }
          } catch (e) {}
          return {
            name: f.name,
            type: f.isDirectory() ? 'dir' : 'file',
            path: path.relative(repoPath, fullFilePath).replace(/\\/g, '/'),
            size
          };
        })
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        });
      res.json({ type: 'dir', entries });
    } else {
      const content = fs.readFileSync(targetPath, 'utf8');
      res.json({ type: 'file', content, name: path.basename(targetPath), size: stats.size });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Write content to a file in a workspace and optionally commit it
app.post('/api/workspaces/:id/write', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  const { path: relPath, content, message } = req.body;
  if (!relPath) return res.status(400).json({ error: 'File path required' });

  const targetPath = path.resolve(repoPath, relPath);

  // Prevent directory traversal attacks
  if (!targetPath.startsWith(path.resolve(repoPath))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Ensure parent directory exists
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(targetPath, content || '', 'utf8');

    if (message) {
      const git = simpleGit(repoPath);
      await git.add(relPath);
      const summary = await git.commit(message);
      res.json({ success: true, summary });
    } else {
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stage or unstage files
app.post('/api/workspaces/:id/stage', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  const { files, stage } = req.body;

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

// Pull latest changes from remote
app.post('/api/workspaces/:id/pull', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    const status = await git.status();
    const branch = status.current;

    const output = await git.pull('origin', branch);
    res.json({ success: true, output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch from remote
app.post('/api/workspaces/:id/fetch', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    const output = await git.fetch();
    res.json({ success: true, output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List branches
app.get('/api/workspaces/:id/branches', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    const branches = await git.branch();
    const result = Object.entries(branches.branches).map(([name, info]) => ({
      name,
      current: info.current,
      commit: info.commit,
      label: info.label
    }));
    res.json({ branches: result, current: branches.current });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Checkout a branch
app.post('/api/workspaces/:id/branches/checkout', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  const { branch, create } = req.body;

  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });
  if (!branch) return res.status(400).json({ error: 'Branch name required' });

  try {
    const git = simpleGit(repoPath);
    const args = create ? ['-b', branch] : [branch];
    const output = await git.checkout(args);
    res.json({ success: true, output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a branch
app.delete('/api/workspaces/:id/branches/:name', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  const branchName = req.params.name;

  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    const output = await git.branch(['-D', branchName]);
    res.json({ success: true, output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get commit log
app.get('/api/workspaces/:id/log', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    let stdout = '';
    try {
      stdout = await git.raw([
        'log',
        '--graph',
        '--all',
        '--date=short',
        '-n',
        '30',
        '--format=format:%H%n%h%n%d%n%s%n%ad%n%an%nCOMMIT_END'
      ]);
    } catch (e) {
      if (e.message.includes('does not have any commits yet') || e.message.includes('bad default revision')) {
        return res.json([]);
      }
      throw e;
    }

    const lines = stdout.split('\n');
    const result = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      if (!line && i === lines.length - 1) {
        i++;
        continue;
      }

      // Check if this line starts a commit block
      const hasHash = line.match(/([a-f0-9]{40})$/i);
      const hasCommitEnd = i + 6 < lines.length && lines[i + 6].endsWith('COMMIT_END');

      if (hasHash && hasCommitEnd) {
        const hash = hasHash[1];
        const graphLen = line.length - 40;
        const graph = line.substring(0, graphLen);

        const shortHash = lines[i + 1].substring(graphLen).trim();
        const refs = lines[i + 2].substring(graphLen).trim();
        const subject = lines[i + 3].substring(graphLen).trim();
        const date = lines[i + 4].substring(graphLen).trim();
        const author = lines[i + 5].substring(graphLen).trim();

        result.push({
          type: 'commit',
          graph,
          hash,
          shortHash,
          refs,
          subject,
          date,
          author
        });

        i += 7;
      } else {
        // Pure graph transition line
        result.push({
          type: 'graph',
          graph: line
        });
        i++;
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stash list
app.get('/api/workspaces/:id/stash', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    const list = await git.stashList();
    res.json({
      stashes: list.all.map(s => ({
        hash: s.hash,
        date: s.date,
        message: s.message
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stash save
app.post('/api/workspaces/:id/stash', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  const { message } = req.body;

  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    const args = message ? ['push', '-m', message] : ['push'];
    await git.stash(args);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stash pop
app.post('/api/workspaces/:id/stash/pop', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    await git.stash(['pop']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stash drop
app.post('/api/workspaces/:id/stash/drop', async (req, res) => {
  const repoPath = getRepoPath(req.params.id);
  if (!repoPath) return res.status(400).json({ error: 'Invalid workspace ID' });

  try {
    const git = simpleGit(repoPath);
    await git.stash(['drop']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});

// Advertise Bonjour/mDNS service
let bonjour;
try {
  bonjour = new Bonjour();
  bonjour.publish({
    name: 'GitMobileToPC Server',
    type: 'gitmobiletopc',
    port: PORT,
    txt: { version: '2.0.0' }
  });
  console.log(`Bonjour mDNS advertising: 'GitMobileToPC Server' (type: gitmobiletopc, port: ${PORT})`);
} catch (err) {
  console.log(`Warning: Failed to start Bonjour discovery advertisement: ${err.message}`);
}

// Graceful shutdown
function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (bonjour) {
    try { bonjour.unpublishAll(); bonjour.destroy(); } catch (e) {}
  }
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
