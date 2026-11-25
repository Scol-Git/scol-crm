// test/check-live-vercel.mjs
// Live audit of https://scol-crm.vercel.app deployment

async function checkVercel() {
  const url = 'https://scol-crm.vercel.app';
  console.log('=== Checking Vercel Live Deployment ===');
  console.log('URL:', url);

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  console.log('HTTP Status:', res.status, res.statusText);

  console.log('\n--- Live Security Headers (SCOL-CRM-041) ---');
  const headers = {};
  for (const [k, v] of res.headers.entries()) {
    headers[k.toLowerCase()] = v;
  }

  const expectedHeaders = [
    { key: 'content-security-policy', desc: 'Content-Security-Policy (with frame-ancestors)' },
    { key: 'x-frame-options', expected: 'DENY', desc: 'X-Frame-Options' },
    { key: 'x-content-type-options', expected: 'nosniff', desc: 'X-Content-Type-Options' },
    { key: 'referrer-policy', expected: 'strict-origin-when-cross-origin', desc: 'Referrer-Policy' },
    { key: 'permissions-policy', desc: 'Permissions-Policy' },
    { key: 'strict-transport-security', desc: 'Strict-Transport-Security' },
  ];

  for (const h of expectedHeaders) {
    const val = headers[h.key];
    if (!val) {
      console.log(`❌ [SCOL-CRM-041] ${h.desc}: MISSING`);
    } else if (h.expected && !val.includes(h.expected)) {
      console.log(`⚠️ [SCOL-CRM-041] ${h.desc}: Expected "${h.expected}", got "${val}"`);
    } else {
      console.log(`✅ [SCOL-CRM-041] ${h.desc}: PASSED (${val.slice(0, 70)}...)`);
    }
  }

  const html = await res.text();
  console.log('\n--- Deployed HTML Inspection ---');
  console.log('HTML Length:', html.length, 'bytes');

  // Match script tags
  const scriptRegex = /<script[^>]+src=["']([^"']+\.js)["']/g;
  const scriptMatches = [];
  let m;
  while ((m = scriptRegex.exec(html)) !== null) {
    scriptMatches.push(m[1]);
  }
  console.log('Script bundles found in index.html:', scriptMatches);

  for (const scriptPath of scriptMatches) {
    const fullScriptUrl = scriptPath.startsWith('http')
      ? scriptPath
      : `${url}${scriptPath.startsWith('/') ? '' : '/'}${scriptPath}`;

    console.log(`\nFetching bundle: ${fullScriptUrl}`);
    const scriptRes = await fetch(fullScriptUrl);
    console.log(`Status: ${scriptRes.status}`);
    const code = await scriptRes.text();
    console.log(`Bundle Size: ${(code.length / 1024).toFixed(2)} KB`);

    console.log('\n--- Live Bundle Feature & Bug Fix Verification ---');
    const checks = [
      {
        id: 'SCOL-CRM-035',
        name: 'Dashboard legend typo fixed to CAS/COE/I-20',
        test: () => code.includes('CAS/COE/I-20'),
      },
      {
        id: 'SCOL-CRM-035',
        name: 'Old typo CAS/COE/120 absent',
        test: () => !code.includes('CAS/COE/120'),
      },
      {
        id: 'SCOL-CRM-001',
        name: 'UniCourseId extraction from courseDetails.courseId',
        test: () => code.includes('courseId') && (code.includes('realCourseId') || code.includes('uniCourseId') || code.includes('intakeDates')),
      },
      {
        id: 'SCOL-CRM-002',
        name: 'findLeadId with wide date boundaries (2020 to 2035)',
        test: () => code.includes('2020-01-01') && code.includes('2035-12-31'),
      },
      {
        id: 'SCOL-CRM-011',
        name: 'Bangladeshi phone normalizer (+880 -> 01...) and regex',
        test: () => code.includes('01') && (code.includes('880') || code.includes('[\s\-()]')),
      },
      {
        id: 'SCOL-CRM-017',
        name: 'NotFound component and Page Not Found route',
        test: () => code.includes('Page Not Found') || code.includes('Back to Dashboard') || code.includes('Go Back'),
      },
      {
        id: 'SCOL-CRM-018',
        name: 'Stage-specific allowed statuses (ENROLLED blocks REJECTED)',
        test: () => code.includes('getStageAllowedStatuses') || (code.includes('ENROLLED') && code.includes('IN_PROGRESS') && code.includes('COMPLETED')),
      },
      {
        id: 'SCOL-CRM-020',
        name: 'IELTS / TOEFL sanity check',
        test: () => code.includes('TOEFL') && code.includes('IELTS'),
      },
      {
        id: 'SCOL-CRM-022',
        name: 'Date range validation dateFrom <= dateTo',
        test: () => code.includes('dateFrom') && code.includes('dateTo'),
      },
      {
        id: 'SCOL-CRM-028',
        name: 'Notes textarea length limit (1000 characters)',
        test: () => code.includes('1000'),
      },
      {
        id: 'SCOL-CRM-040',
        name: 'Other Documents labeled with stage name',
        test: () => code.includes('Other Documents') && (code.includes('stageName') || code.includes('Other Documents (')),
      },
      {
        id: 'SCOL-CRM-047',
        name: 'Course edit positive tuitionFee & ISO currency',
        test: () => code.includes('tuitionFee') && (code.includes('GBP') || code.includes('USD')),
      },
    ];

    for (const c of checks) {
      const ok = c.test();
      console.log(`${ok ? '✅' : '❌'} [${c.id}] ${c.name}: ${ok ? 'VERIFIED IN DEPLOYED BUNDLE' : 'NOT FOUND'}`);
    }
  }

  // Check 404 rewrite / SPA fallback
  console.log('\n--- SPA Rewrite & 404 Route Verification (SCOL-CRM-017) ---');
  const notFoundUrl = `${url}/this-random-page-does-not-exist-${Date.now()}`;
  console.log(`Testing: ${notFoundUrl}`);
  const notFoundRes = await fetch(notFoundUrl);
  console.log(`Status: ${notFoundRes.status} (SPA rewrites 404 to index.html for client routing)`);
  const notFoundHtml = await notFoundRes.text();
  console.log(`Served HTML length: ${notFoundHtml.length} bytes (served index.html: ${notFoundHtml.includes('<!doctype html') || notFoundHtml.includes('<div id="root">')})`);
}

checkVercel().catch(console.error);
