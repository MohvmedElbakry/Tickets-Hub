import { execSync } from 'child_process';

async function runAllTestSuites() {
  console.log('================================================================');
  console.log('   TICKETS HUB — MASTER QA AUTOMATION CERTIFICATION SUITE RUNNER  ');
  console.log('================================================================\n');

  const testSuites = [
    { name: '1. Financial Ledger & Double-Entry Accounting', script: 'scripts/test-financial-system.ts' },
    { name: '2. Marketplace Resale Lifecycle & Settlement', script: 'scripts/test-resale-lifecycle.ts' },
    { name: '3. Auth, RBAC, IDOR & Security', script: 'scripts/test-auth-security.ts' },
    { name: '4. QR Validation, PDF Buffer & Notifications', script: 'scripts/test-qr-pdf-notifications.ts' },
    { name: '5. Concurrency, Race Conditions & E2E Lifecycle', script: 'scripts/test-concurrency-e2e.ts' },
    { name: '6. Venue Scanner & QR Check-In End-to-End', script: 'scripts/test-venue-scanner.ts' }
  ];

  let totalPassedSuites = 0;
  let totalFailedSuites = 0;

  for (const suite of testSuites) {
    console.log(`▶ Running Suite: ${suite.name}...`);
    try {
      execSync(`npx tsx ${suite.script}`, { stdio: 'inherit' });
      console.log(`✅ ${suite.name} PASSED COMPLETELY.\n`);
      totalPassedSuites++;
    } catch (err) {
      console.error(`❌ ${suite.name} FAILED!`);
      totalFailedSuites++;
    }
  }

  console.log('================================================================');
  console.log(`🏁 CERTIFICATION RUN COMPLETE: ${totalPassedSuites}/${testSuites.length} SUITES PASSED`);
  console.log('================================================================');

  if (totalFailedSuites > 0) {
    process.exit(1);
  }
}

runAllTestSuites();
