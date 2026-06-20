import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const SCAN_DIR = config.scanDir;

function findGitRepos(dir, depth = 0, maxDepth = 2) {
  let repos = [];
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
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
    // skip
  }
  return repos;
}

console.log(`Scanning ${SCAN_DIR}...`);
const repos = findGitRepos(SCAN_DIR);
console.log(`Found repositories:`);
console.log(repos);
if (repos.length === 0) {
  console.log('No repositories found. Make sure there is a folder containing a .git folder in the scan directory.');
} else {
  console.log('✅ Scanning successful!');
}
