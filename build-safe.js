const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 ExcaliNote - Safe Build Process');
console.log('=====================================');

// Function to clean directories with retry logic
function cleanDirectory(dirName, maxRetries = 3) {
  const dirPath = path.join(__dirname, dirName);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`✅ ${dirName} directory already clean`);
    return true;
  }
  
  console.log(`🧹 Cleaning ${dirName} directory...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try multiple methods to remove the directory
      if (process.platform === 'win32') {
        // Windows-specific approach
        execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'pipe' });
      } else {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
      
      console.log(`✅ Successfully cleaned ${dirName} directory`);
      return true;
    } catch (error) {
      console.log(`⚠️  Attempt ${i + 1}/${maxRetries} failed for ${dirName}: ${error.message}`);
      if (i < maxRetries - 1) {
        // Wait before retry
        setTimeout(() => {}, 1000 * (i + 1));
      }
    }
  }
  
  console.log(`❌ Could not clean ${dirName} directory after ${maxRetries} attempts`);
  return false;
}

// Clean build directories
console.log('🧹 Starting cleanup process...');
const directories = ['dist', 'dist-electron', 'release'];
let allClean = true;

directories.forEach(dir => {
  if (!cleanDirectory(dir)) {
    allClean = false;
  }
});

if (!allClean) {
  console.log('\n⚠️  Some directories could not be cleaned. Proceeding anyway...');
}

// Build process
console.log('\n📦 Starting build process...');

try {
  console.log('Building with Vite + Electron...');
  execSync('vite build', { stdio: 'inherit' });
  
  console.log('\nBuilding Electron app...');
  execSync('electron-builder', { stdio: 'inherit' });
  
  console.log('\n🎉 Build completed successfully!');
  console.log('📂 Output directory: ./release/');
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  
  // Suggest solutions
  console.log('\n💡 Possible solutions:');
  console.log('1. Close any running ExcaliNote instances');
  console.log('2. Restart your computer to release file locks');
  console.log('3. Check if antivirus software is blocking the build');
  console.log('4. Try running: npm run build:clean');
  
  process.exit(1);
}
