const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning previous builds...');

// Clean dist and dist-electron directories
const dirsToClean = ['dist', 'dist-electron', 'release'];
dirsToClean.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Cleaned ${dir} directory`);
    } catch (error) {
      console.log(`⚠️  Could not clean ${dir}: ${error.message}`);
    }
  }
});

console.log('📦 Starting build process...');

try {
  // Build the project
  execSync('npm run build', { stdio: 'inherit' });
  console.log('🎉 Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
