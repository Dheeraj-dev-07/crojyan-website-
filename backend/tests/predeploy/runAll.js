const path = require('path');
const { spawnSync } = require('child_process');

async function runAllPredeployChecks() {
  console.log('\n================================================================');
  console.log('🚀 RUNNING COMPREHENSIVE PRE-DEPLOYMENT VERIFICATION SUITE');
  console.log('   App: Crojyan Crochet Bouquet E-Commerce Platform');
  console.log('   Mode: READ-ONLY CHECK (No application code modified)');
  console.log('================================================================\n');

  const startTime = Date.now();
  const checks = [
    { id: 'CHECK 1', file: 'check1_webhook_intake.test.js', title: 'Webhook Intake Verification' },
    { id: 'CHECK 2', file: 'check2_event_sequences.test.js', title: 'Event Sequences Against Real Handler' },
    { id: 'CHECK 3', file: 'check3_payment_integrity.test.js', title: 'Payment Route Integrity' },
    { id: 'CHECK 4', file: 'check4_production_boot.test.js', title: 'Production Boot and Config' },
    { id: 'CHECK 5', file: 'check5_frontend_scan.test.js', title: 'Frontend Build and Leak Scan' },
    { id: 'CHECK 6', file: 'check6_admin_and_hygiene.test.js', title: 'Admin, State Visibility & Log Hygiene' }
  ];

  const results = [];

  for (const check of checks) {
    const testFilePath = path.join(__dirname, check.file);
    console.log(`\n>>> STARTING ${check.id}: ${check.title}...`);
    const startCheckTime = Date.now();

    const proc = spawnSync(process.execPath, [testFilePath], {
      cwd: path.resolve(__dirname, '../../..'),
      encoding: 'utf8',
      env: { ...process.env }
    });

    const duration = ((Date.now() - startCheckTime) / 1000).toFixed(1);
    const passed = proc.status === 0;

    console.log(proc.stdout);
    if (proc.stderr && proc.stderr.trim()) {
      console.error(proc.stderr);
    }

    results.push({
      id: check.id,
      title: check.title,
      file: check.file,
      status: passed ? 'COMPLETED' : 'FAILED_EXIT',
      duration: `${duration}s`,
      exitCode: proc.status
    });
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n================================================================');
  console.log(`🏁 ALL PRE-DEPLOYMENT CHECKS FINISHED in ${elapsedSec}s`);
  console.log('================================================================');
  console.log('| Check | Verification Area | Exit Code | Duration |');
  console.log('| :--- | :--- | :--- | :--- |');
  results.forEach(r => {
    console.log(`| ${r.id} | ${r.title} | ${r.exitCode === 0 ? '0 (SUCCESS)' : r.exitCode + ' (FAIL)'} | ${r.duration} |`);
  });
  console.log('================================================================\n');

  return results;
}

if (require.main === module) {
  runAllPredeployChecks().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = runAllPredeployChecks;
