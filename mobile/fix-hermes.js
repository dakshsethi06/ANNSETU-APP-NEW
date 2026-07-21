const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper to recursively copy directories
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  const tempDir = path.join(__dirname, 'temp-fix-hermes');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('Downloading hermes-parser packages from npm registry...');
  try {
    execSync('npx -y pacote extract hermes-parser@0.29.1 ' + path.join(tempDir, '0.29.1'), { stdio: 'inherit' });
    execSync('npx -y pacote extract hermes-parser@0.32.0 ' + path.join(tempDir, '0.32.0'), { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to extract packages:', e.message);
    process.exit(1);
  }

  // Define target directories
  const targetDirs = [
    { path: path.join(__dirname, 'node_modules', 'hermes-parser'), version: '0.29.1' },
    { path: path.join(__dirname, 'node_modules', '@react-native', 'codegen', 'node_modules', 'hermes-parser'), version: '0.29.1' },
    { path: path.join(__dirname, 'node_modules', 'babel-plugin-syntax-hermes-parser', 'node_modules', 'hermes-parser'), version: '0.29.1' },
    { path: path.join(__dirname, 'node_modules', 'expo', 'node_modules', 'hermes-parser'), version: '0.29.1' }
  ];

  targetDirs.forEach(target => {
    if (fs.existsSync(target.path)) {
      // Determine version by package.json
      let version = target.version;
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(target.path, 'package.json'), 'utf8'));
        version = pkg.version || target.version;
      } catch (e) {}

      const extractedDist = path.join(tempDir, version, 'dist');
      const targetDist = path.join(target.path, 'dist');

      if (fs.existsSync(extractedDist)) {
        console.log(`\n-----------------------------------------------`);
        console.log(`Fixing package: ${target.path} (v${version})`);

        // 1. Delete the existing incomplete dist directory
        if (fs.existsSync(targetDist)) {
          fs.rmSync(targetDist, { recursive: true, force: true });
        }

        // 2. Copy the entire fresh dist directory
        console.log(`Copying full dist folder from registry...`);
        copyDirSync(extractedDist, targetDist);

        // 3. Fix the generated visitor keys packaging bug by creating dist/generated
        let genSrc = path.join(extractedDist, 'src', 'generated');
        if (!fs.existsSync(genSrc)) {
          genSrc = path.join(extractedDist, 'generated');
        }
        
        if (fs.existsSync(genSrc)) {
          const destGen = path.join(targetDist, 'generated');
          if (!fs.existsSync(destGen)) {
            fs.mkdirSync(destGen, { recursive: true });
          }
          console.log(`Creating missing dist/generated mapping...`);
          fs.copyFileSync(path.join(genSrc, 'ESTreeVisitorKeys.js'), path.join(destGen, 'ESTreeVisitorKeys.js'));
          fs.copyFileSync(path.join(genSrc, 'ParserVisitorKeys.js'), path.join(destGen, 'ParserVisitorKeys.js'));
        }

        // Verify key files exist
        const hasVisitorKeys = fs.existsSync(path.join(targetDist, 'generated', 'ParserVisitorKeys.js'));
        const hasSimpleTransform = fs.existsSync(path.join(targetDist, 'transform', 'SimpleTransform.js'));
        
        if (hasVisitorKeys && hasSimpleTransform) {
          console.log(`✅ Success! dist/generated/ParserVisitorKeys.js and dist/transform/SimpleTransform.js verified.`);
        } else {
          console.error(`❌ Verification failed! Keys: ${hasVisitorKeys}, Transform: ${hasSimpleTransform}`);
        }
      }
    }
  });

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('\nAll hermes-parser instances repaired successfully!');
}

main().catch(console.error);
