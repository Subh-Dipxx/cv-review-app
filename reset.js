const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Complete Next.js Reset');

// Delete build artifacts
const cleanDirs = ['.next', 'node_modules'];
cleanDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Removing ${dir}...`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
});

// Delete lock files
const lockFiles = ['package-lock.json', 'yarn.lock'];
lockFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`Removing ${file}...`);
    fs.unlinkSync(filePath);
  }
});

// Create absolute minimal package.json
const minimalPackageJson = {
  "name": "cv-review-app",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "13.4.7",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
};

console.log('Creating minimal package.json...');
fs.writeFileSync(
  path.join(__dirname, 'package.json'),
  JSON.stringify(minimalPackageJson, null, 2)
);

// Install basic dependencies
console.log('Installing basic dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
}

console.log(`
✅ Reset complete!

Next steps:
1. Run: npm run dev
2. If it works, gradually add back your dependencies
3. If it still fails, try: npm run dev -- -p 3001

If nothing works, access the static page at:
file://${path.join(__dirname, 'public', 'static.html')}
`);
