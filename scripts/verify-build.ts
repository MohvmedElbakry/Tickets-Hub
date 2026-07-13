import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('api');
const OUT_DIR = path.resolve('api', 'dist');

console.log('🏁 [Build Verifier] Starting build output verification...');
console.log(`📂 Source Directory: ${SRC_DIR}`);
console.log(`📂 Output Directory: ${OUT_DIR}`);

// Get all source files recursively
function getSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      // Skip dist and node_modules folders
      if (file === 'dist' || file === 'node_modules') {
        continue;
      }
      results = results.concat(getSourceFiles(filePath));
    } else {
      // Only care about compileable source files
      if ((file.endsWith('.ts') || file.endsWith('.tsx')) && file !== '[...all].ts') {
        results.push(filePath);
      }
    }
  }
  return results;
}

function verifyBuild() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`\n🚨 Error: Output compiler directory "${OUT_DIR}" does not exist!`);
    console.error(`💡 Run "npm run build" or compile with tsc first to generate build outputs.\n`);
    process.exit(1);
  }

  const sources = getSourceFiles(SRC_DIR);
  console.log(`📄 Found ${sources.length} compileable source file(s) in "api/". Checking matching outputs...\n`);

  let missingOutputs = 0;

  for (const srcFile of sources) {
    const relativeSrc = path.relative(SRC_DIR, srcFile);
    
    // Determine expected compiled filename
    const stem = relativeSrc.slice(0, -path.extname(srcFile).length);
    const expectedOutFile = path.join(OUT_DIR, stem + '.js');
    const relativeOut = path.relative(process.cwd(), expectedOutFile);

    if (!fs.existsSync(expectedOutFile)) {
      missingOutputs++;
      console.error(`❌ [BUILD MISMATCH] Missing expected compiled JS output file!`);
      console.error(`   Source: ${path.relative(process.cwd(), srcFile)}`);
      console.error(`   Output: ${relativeOut}`);
      console.error('');
    } else {
      const stats = fs.statSync(expectedOutFile);
      if (stats.size === 0) {
        missingOutputs++;
        console.error(`❌ [BUILD ERROR] Compiled output exists but is empty (0 bytes)!`);
        console.error(`   Output: ${relativeOut}`);
        console.error('');
      } else {
        console.log(`✅ Matches output: ${relativeOut}`);
      }
    }
  }

  console.log('\n--- SCAN COMPLETE ---');
  if (missingOutputs > 0) {
    console.error(`🚨 Failure! Detected ${missingOutputs} missing or corrupt build outputs.`);
    console.error(`💡 Ensure your tsconfig.server.json has correct "outDir" and "include" paths, and that tsc was run successfully.\n`);
    process.exit(1);
  } else {
    console.log(`🎉 Build check succeeded! All ${sources.length} matching compiled JS modules are safely present inside ${path.relative(process.cwd(), OUT_DIR)}.`);
    process.exit(0);
  }
}

verifyBuild();
