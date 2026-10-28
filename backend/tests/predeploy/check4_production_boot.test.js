const path = require('path');
const { spawnSync } = require('child_process');
const {
  BACKEND_ROOT,
  DUMMY_SECRETS,
  startInMemoryMongo,
  stopInMemoryMongo,
  createTestClient
} = require('./common');
const mongoose = require('mongoose');

async function runCheck4() {
  console.log('====================================================');
  console.log('CHECK 4: PRODUCTION BOOT AND CONFIG VERIFICATION');
  console.log('====================================================');

  const results = {
    check4a: { name: 'Production boot & GET /health (200 connected, 503 disconnected)', status: 'PENDING', details: [] },
    check4b: { name: 'Environment variable fail-fast (missing required vars & short JWT_SECRET)', status: 'PENDING', details: [] },
    check4c: { name: 'Production CORS origin normalization, wildcard exclusion & originless requests', status: 'PENDING', details: [] },
    check4d: { name: 'Proxy rate limiting (TRUST_PROXY_HOPS=1) & no express-rate-limit ERR_ERL_* warnings', status: 'PENDING', details: [] },
    check4e: { name: 'Production error response shape, absence of stack traces/filepaths/secrets', status: 'PENDING', details: [] },
    check4f: { name: 'Razorpay mode startup logging audit (rzp_test_ vs rzp_live_)', status: 'PENDING', details: [] }
  };

  const mongoUri = await startInMemoryMongo();

  // ----------------------------------------------------
  // CHECK 4a: Production boot & health check
  // ----------------------------------------------------
  console.log('\n[4a] Testing production boot and GET /health...');
  // Clear require.cache for application src files only (preserving node_modules / mongoose singleton)
  for (const key of Object.keys(require.cache)) {
    if (key.includes('src') && !key.includes('node_modules')) {
      delete require.cache[key];
    }
  }

  // Set production environment
  process.env.NODE_ENV = 'production';
  process.env.CLIENT_URL = 'https://crojyan.com,https://admin.crojyan.com/';
  process.env.TRUST_PROXY_HOPS = '1';

  const app = require(path.join(BACKEND_ROOT, 'src/app'));
  const client = createTestClient(app);
  await client.start();

  try {
    // 1. Health check while connected
    const healthConnected = await client.request('/health');
    const health200Ok = healthConnected.status === 200 &&
      healthConnected.body?.status === 'UP' &&
      healthConnected.body?.database === 'connected';
    results.check4a.details.push(
      `GET /health while DB connected returned HTTP ${healthConnected.status} with body: ${JSON.stringify(healthConnected.body)}: ${health200Ok ? 'OK' : 'FAIL'}`
    );

    // 2. Health check while disconnected
    await mongoose.disconnect();
    const healthDisconnected = await client.request('/health');
    const health503Ok = healthDisconnected.status === 503 &&
      healthDisconnected.body?.status === 'DOWN' &&
      healthDisconnected.body?.database === 'disconnected';
    results.check4a.details.push(
      `GET /health while DB disconnected returned HTTP ${healthDisconnected.status} with body: ${JSON.stringify(healthDisconnected.body)}: ${health503Ok ? 'OK' : 'FAIL'}`
    );

    // Reconnect for subsequent tests
    await mongoose.connect(mongoUri);

    results.check4a.status = (health200Ok && health503Ok) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 4b: Fail-fast env validation
    // ----------------------------------------------------
    console.log('\n[4b] Testing process exit when each required env variable is missing...');
    const requiredVars = [
      'MONGO_URI',
      'JWT_SECRET',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'CLIENT_URL'
    ];

    let allVarsExitedOk = true;

    for (const varName of requiredVars) {
      // Build env with all dummy values, but set target var to empty string ''
      // (prevents dotenv from reading real .env and triggers !process.env[key] check)
      const testEnv = {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '0',
        MONGO_URI: mongoUri,
        JWT_SECRET: DUMMY_SECRETS.JWT_SECRET,
        RAZORPAY_KEY_ID: DUMMY_SECRETS.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: DUMMY_SECRETS.RAZORPAY_KEY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: DUMMY_SECRETS.RAZORPAY_WEBHOOK_SECRET,
        CLOUDINARY_CLOUD_NAME: DUMMY_SECRETS.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: DUMMY_SECRETS.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: DUMMY_SECRETS.CLOUDINARY_API_SECRET,
        CLIENT_URL: 'https://crojyan.com'
      };
      testEnv[varName] = '';

      const scriptPath = path.join(BACKEND_ROOT, 'src/config/env.js').replace(/\\/g, '/');
      const proc = spawnSync(process.execPath, ['-e', `require('${scriptPath}')`], {
        env: testEnv,
        encoding: 'utf8'
      });

      const exitedNonZero = proc.status !== 0;
      const namedVariable = proc.stderr.includes(varName);

      if (exitedNonZero && namedVariable) {
        results.check4b.details.push(`Omission of ${varName}: Exited with code ${proc.status}, named variable in stderr: OK`);
      } else {
        allVarsExitedOk = false;
        results.check4b.details.push(`Omission of ${varName}: FAILED (status=${proc.status}, stderr=${proc.stderr.trim()})`);
      }
    }

    // Test JWT_SECRET shorter than 32 characters
    console.log('Testing JWT_SECRET shorter than 32 characters...');
    const shortJwtEnv = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '0',
      MONGO_URI: mongoUri,
      JWT_SECRET: 'short_secret_only_24_ch',
      RAZORPAY_KEY_ID: DUMMY_SECRETS.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: DUMMY_SECRETS.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: DUMMY_SECRETS.RAZORPAY_WEBHOOK_SECRET,
      CLOUDINARY_CLOUD_NAME: DUMMY_SECRETS.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: DUMMY_SECRETS.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: DUMMY_SECRETS.CLOUDINARY_API_SECRET,
      CLIENT_URL: 'https://crojyan.com'
    };
    const envScriptPath = path.join(BACKEND_ROOT, 'src/config/env.js').replace(/\\/g, '/');
    const shortJwtProc = spawnSync(process.execPath, ['-e', `require('${envScriptPath}')`], {
      env: shortJwtEnv,
      encoding: 'utf8'
    });
    const shortJwtFailed = shortJwtProc.status !== 0 && shortJwtProc.stderr.includes('at least 32 characters');
    results.check4b.details.push(
      `JWT_SECRET < 32 chars: Exited with code ${shortJwtProc.status}, output: '${shortJwtProc.stderr.trim()}': ${shortJwtFailed ? 'OK' : 'FAIL'}`
    );

    results.check4b.status = (allVarsExitedOk && shortJwtFailed) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 4c: CORS configuration in production
    // ----------------------------------------------------
    console.log('\n[4c] Testing production CORS policy...');
    // Allowed origin 1 (trailing slash stripped during normalization)
    const corsRes1 = await client.request('/health', {
      headers: { Origin: 'https://crojyan.com' }
    });
    const allowOrigin1 = corsRes1.headers['access-control-allow-origin'];
    const cors1Ok = allowOrigin1 === 'https://crojyan.com';
    results.check4c.details.push(`Allowed origin https://crojyan.com -> Access-Control-Allow-Origin: ${allowOrigin1} (expected match): ${cors1Ok ? 'OK' : 'FAIL'}`);

    // Allowed origin 2
    const corsRes2 = await client.request('/health', {
      headers: { Origin: 'https://admin.crojyan.com' }
    });
    const allowOrigin2 = corsRes2.headers['access-control-allow-origin'];
    const cors2Ok = allowOrigin2 === 'https://admin.crojyan.com';
    results.check4c.details.push(`Allowed origin https://admin.crojyan.com -> Access-Control-Allow-Origin: ${allowOrigin2} (expected match): ${cors2Ok ? 'OK' : 'FAIL'}`);

    // Disallowed origin
    const corsResDisallowed = await client.request('/health', {
      headers: { Origin: 'https://malicious-website.com' }
    });
    const allowOriginDisallowed = corsResDisallowed.headers['access-control-allow-origin'];
    const corsDisallowedOk = !allowOriginDisallowed;
    results.check4c.details.push(`Disallowed origin https://malicious-website.com -> Access-Control-Allow-Origin: ${allowOriginDisallowed || 'NONE'} (blocked): ${corsDisallowedOk ? 'OK' : 'FAIL'}`);

    // Wildcard origin in production test
    const wildcardRes = await client.request('/health', {
      headers: { Origin: '*' }
    });
    const allowWildcard = wildcardRes.headers['access-control-allow-origin'];
    const wildcardBlocked = allowWildcard !== '*';
    results.check4c.details.push(`Wildcard origin '*' -> Access-Control-Allow-Origin: ${allowWildcard || 'NONE'} (wildcard rejected in production): ${wildcardBlocked ? 'OK' : 'FAIL'}`);

    // Request without Origin header (e.g. server-to-server, health monitor, Razorpay webhooks)
    const noOriginRes = await client.request('/health');
    const noOriginOk = noOriginRes.status === 200;
    results.check4c.details.push(`Request without Origin header -> HTTP ${noOriginRes.status}: ${noOriginOk ? 'OK' : 'FAIL'}`);

    results.check4c.status = (cors1Ok && cors2Ok && corsDisallowedOk && wildcardBlocked && noOriginOk) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 4d: Proxy rate limiting (TRUST_PROXY_HOPS=1)
    // ----------------------------------------------------
    console.log('\n[4d] Testing rate limiter under proxy (TRUST_PROXY_HOPS=1) with distinct X-Forwarded-For IPs...');
    const rateLimitWarnings = [];

    // Exhaust login attempts for IP A (5 attempts max)
    const ipA = '198.51.100.1';
    const ipB = '198.51.100.2';

    let ipAHit429 = false;
    for (let i = 0; i < 6; i++) {
      const res = await client.request('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': ipA
        },
        body: JSON.stringify({ email: 'admin@crojyan.com', password: 'WrongPassword123!' })
      });
      if (res.status === 429) {
        ipAHit429 = true;
      }
    }

    // Now test IP B: must NOT be blocked by IP A's limit
    const resIpB = await client.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ipB
      },
      body: JSON.stringify({ email: 'admin@crojyan.com', password: 'WrongPassword123!' })
    });
    const ipBSeparate = resIpB.status === 401; // Not 429!

    results.check4d.details.push(`Client IP A (${ipA}) reached rate limit (HTTP 429 triggered): ${ipAHit429 ? 'OK' : 'FAIL'}`);
    results.check4d.details.push(`Client IP B (${ipB}) was counted separately and returned HTTP ${resIpB.status} (expected 401, not 429): ${ipBSeparate ? 'OK' : 'FAIL'}`);

    // Check for express-rate-limit ERR_ERL_* warnings in logger output
    const fs = require('fs');
    const combinedLogPath = path.join(BACKEND_ROOT, 'logs/combined.log');
    let hasErlWarning = false;
    if (fs.existsSync(combinedLogPath)) {
      const logContent = fs.readFileSync(combinedLogPath, 'utf8');
      if (logContent.includes('ERR_ERL_')) {
        hasErlWarning = true;
      }
    }
    results.check4d.details.push(`express-rate-limit ERR_ERL_* warning check: ${hasErlWarning ? 'FAIL (warning found)' : 'OK (zero ERR_ERL_* warnings)'}`);

    results.check4d.status = (ipAHit429 && ipBSeparate && !hasErlWarning) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 4e: Production error responses
    // ----------------------------------------------------
    console.log('\n[4e] Triggering validation error, 404, and thrown error to verify production response shape and secret hygiene...');
    // 1. Validation error
    const valErrRes = await client.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '' })
    });

    // 2. 404 route error
    const notFoundRes = await client.request('/api/v1/nonexistent-endpoint-test-404');

    // 3. Thrown error (e.g. invalid signature on verify-payment)
    const thrownErrRes = await client.request('/api/v1/payments/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: 'order_test_4e',
        razorpay_payment_id: 'pay_test_4e',
        razorpay_signature: 'invalid_sig'
      })
    });

    const errorResponses = [
      { type: 'Validation Error', res: valErrRes },
      { type: '404 Not Found', res: notFoundRes },
      { type: 'Thrown Business Error', res: thrownErrRes }
    ];

    let allErrorsStandardShape = true;
    let leakedDiagnostics = false;

    for (const item of errorResponses) {
      const body = item.res.body;
      const rawText = item.res.text;

      // Real shape check: { success: false, error: { code, message, ... } }
      const hasSuccessFalse = body && body.success === false;
      const hasErrorCode = body && body.error && typeof body.error.code === 'string';
      const hasErrorMessage = body && body.error && typeof body.error.message === 'string';
      const shapeOk = hasSuccessFalse && hasErrorCode && hasErrorMessage;

      if (!shapeOk) allErrorsStandardShape = false;

      // Leak check: stack trace, Windows/Linux file paths, env secrets
      const hasStack = rawText.includes('stack') || rawText.includes('    at ');
      const hasFilePath = rawText.includes('C:\\') || rawText.includes('/src/');
      const hasEnvSecret = rawText.includes(DUMMY_SECRETS.JWT_SECRET) || rawText.includes(DUMMY_SECRETS.RAZORPAY_KEY_SECRET);

      if (hasStack || hasFilePath || hasEnvSecret) {
        leakedDiagnostics = true;
      }

      results.check4e.details.push(
        `${item.type} (HTTP ${item.res.status}): Shape={ success: ${body?.success}, error: { code: "${body?.error?.code}", message: "${body?.error?.message}" } }. Stack/path/secret leak: ${hasStack || hasFilePath || hasEnvSecret ? 'LEAK DETECTED' : 'CLEAN'}`
      );
    }

    results.check4e.details.push('Real response envelope: { success: false, error: { code: string, message: string, details?: any } }');
    results.check4e.status = (allErrorsStandardShape && !leakedDiagnostics) ? 'PASS' : 'FAIL';

    // ----------------------------------------------------
    // CHECK 4f: Razorpay mode startup logging
    // ----------------------------------------------------
    console.log('\n[4f] Auditing Razorpay mode startup logging...');
    const rzpConfigPath = path.join(BACKEND_ROOT, 'src/config/razorpay.js');
    const rzpConfigCode = fs.readFileSync(rzpConfigPath, 'utf8');

    const logsActiveMode = rzpConfigCode.includes('rzp_live') || rzpConfigCode.includes('rzp_test') || rzpConfigCode.includes('keyId.startsWith');

    if (logsActiveMode) {
      results.check4f.status = 'PASS';
      results.check4f.details.push('App logs whether Razorpay is running in rzp_test_ or rzp_live_ mode at startup.');
    } else {
      results.check4f.status = 'FAIL';
      results.check4f.details.push(
        'App does NOT log which Razorpay mode (rzp_test_ vs rzp_live_) is active at startup. It only logs generic "Razorpay SDK client instance initialized successfully." without distinguishing Test from Live mode.'
      );
      results.check4f.details.push(
        'Suggested Minimal Fix in repo/backend/src/config/razorpay.js:line 12:\n' +
        '  const mode = env.razorpay.keyId?.startsWith("rzp_live_") ? "LIVE" : "TEST";\n' +
        '  logger.info(`Razorpay SDK client instance initialized in [${mode}] mode.`);'
      );
    }

  } finally {
    await client.close();
    await stopInMemoryMongo();
  }

  console.log('\n--- CHECK 4 SUMMARY ---');
  for (const [key, val] of Object.entries(results)) {
    console.log(`[${val.status}] ${key}: ${val.name}`);
    val.details.forEach(d => console.log(`   - ${d}`));
  }

  return results;
}

if (require.main === module) {
  runCheck4().catch(err => {
    console.error('Fatal error running Check 4:', err);
    process.exit(1);
  });
}

module.exports = runCheck4;
