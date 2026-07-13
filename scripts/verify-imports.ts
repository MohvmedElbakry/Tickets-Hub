import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const TARGET_DIR = path.resolve('api');
const EXCLUDED_DIRS = ['node_modules', 'dist', '.git', '.next'];

console.log('🔍 [Import Verifier] Starting source code import validation...');
console.log(`📂 Scanning directory: ${TARGET_DIR}`);

// Walk directory recursively
function getAllFiles(dir: string, excluded: string[]): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (excluded.some(ex => filePath.includes(ex))) {
        continue;
      }
      results = results.concat(getAllFiles(filePath, excluded));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

// Case-sensitive file existence check (works on Windows, macOS, and Linux)
function checkCaseSensitiveExists(absolutePath: string): boolean {
  const normalized = path.normalize(absolutePath);
  const parsed = path.parse(normalized);
  const root = parsed.root;
  let currentDir = root;

  const relativePath = path.relative(root, normalized);
  if (relativePath === '') {
    return fs.existsSync(root);
  }

  const segments = relativePath.split(path.sep);

  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      currentDir = path.resolve(currentDir, segment);
      continue;
    }

    try {
      if (!fs.existsSync(currentDir)) {
        return false;
      }
      const children = fs.readdirSync(currentDir);
      if (!children.includes(segment)) {
        return false;
      }
      currentDir = path.join(currentDir, segment);
    } catch (err) {
      return false;
    }
  }

  return true;
}

// Helper to find original line number of import
function getLineNumber(content: string, importPathStr: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(importPathStr)) {
      return i + 1;
    }
  }
  return 1;
}

// Main verification logic
function verifyImports() {
  const files = getAllFiles(TARGET_DIR, EXCLUDED_DIRS)
    .filter(file => file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))
    .filter(file => !file.endsWith('[...all].ts'));

  console.log(`📄 Found ${files.length} source file(s) to scan (excluding deployment entrypoints).\n`);

  const IMPORT_PATTERNS = [
    /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(['"]([^'"]+)['"]\)/g,
    /require\(['"]([^'"]+)['"]\)/g
  ];

  let totalImportsChecked = 0;
  let validationFailures = 0;

  for (const file of files) {
    const relativeSrcPath = path.relative(process.cwd(), file);
    const fileContent = fs.readFileSync(file, 'utf-8');
    const fileDir = path.dirname(file);

    for (const pattern of IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(fileContent)) !== null) {
        const importPath = match[1];
        
        // Skip package dependencies
        if (!importPath.startsWith('.')) {
          continue;
        }

        // Skip imports targeting generated build outputs (e.g. dist/ or build/)
        if (importPath.includes('/dist/') || importPath.startsWith('./dist/')) {
          continue;
        }

        totalImportsChecked++;
        const rawResolvedPath = path.resolve(fileDir, importPath);
        
        // Resolve target extensions
        let candidates: string[] = [];
        
        if (importPath.endsWith('.js')) {
          const stem = rawResolvedPath.slice(0, -3);
          candidates = [
            stem + '.ts',
            stem + '.tsx',
            rawResolvedPath // actual JS file if exists
          ];
        } else if (importPath.endsWith('.jsx')) {
          const stem = rawResolvedPath.slice(0, -4);
          candidates = [
            stem + '.tsx',
            rawResolvedPath // actual JSX file if exists
          ];
        } else if (path.extname(importPath) === '') {
          // Extensionless modules (checking directory index files, JS, TS, etc.)
          candidates = [
            rawResolvedPath + '.ts',
            rawResolvedPath + '.tsx',
            rawResolvedPath + '.js',
            rawResolvedPath + '.jsx',
            rawResolvedPath + '.json',
            path.join(rawResolvedPath, 'index.ts'),
            path.join(rawResolvedPath, 'index.tsx'),
            path.join(rawResolvedPath, 'index.js')
          ];
        } else {
          candidates = [rawResolvedPath];
        }

        let matchedCandidate = candidates.find(candidate => checkCaseSensitiveExists(candidate));

        if (!matchedCandidate) {
          validationFailures++;
          const lineNum = getLineNumber(fileContent, importPath);
          console.error(`❌ [IMPORT ERROR] Unresolved or mismatched module in ${relativeSrcPath}:${lineNum}`);
          console.error(`   👉 Referenced Import: "${importPath}"`);
          console.error(`   🔍 Tried Candidates (Case-Sensitive Check):`);
          candidates.forEach(c => console.error(`      - ${path.relative(process.cwd(), c)}`));
          console.error('');
        }
      }
    }
  }

  console.log('--- SCAN COMPLETE ---');
  console.log(`✅ Checked ${totalImportsChecked} relative import(s) across ${files.length} source file(s).`);

  if (validationFailures > 0) {
    console.error(`\n🚨 Failed validation! Detected ${validationFailures} broken imports/mismatches.`);
    console.error(`💡 Tips to resolve:`);
    console.error(`   1. Ensure the import path spelling is EXACTLY matching the file name on disk (case-sensitive).`);
    console.error(`   2. In ESM NodeNext mode, imports of '.ts' files should end with '.js' (TypeScript maps this during compilation).`);
    console.error(`   3. Clean the build directory or recompile first to align typescript configurations if needed.\n`);
    process.exit(1);
  } else {
    console.log('🎉 Validation succeeded! All imports exist and casing is 100% correct.');
    process.exit(0);
  }
}

verifyImports();
