const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8789;

// In-memory stores for local dev
const localIVHistory = {};
const localSavedStrategies = [];
const localUsers = {};
let savedIdCounter = 1;

const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function fetchText(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ data, headers: res.headers }));
    }).on('error', reject);
  });
}

let yahooCrumb = null, yahooCookie = null, crumbExpiry = 0;
async function getYahooCrumb() {
  if (yahooCrumb && Date.now() < crumbExpiry) return { crumb: yahooCrumb, cookie: yahooCookie };
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
  const cookie = await new Promise((resolve, reject) => {
    https.get('https://fc.yahoo.com/x', { headers: { 'User-Agent': ua } }, (res) => {
      const sc = res.headers['set-cookie'];
      const c = sc ? sc[0].split(';')[0] : '';
      res.resume();
      res.on('end', () => resolve(c));
    }).on('error', reject);
  });
  const crumbResp = await fetchText('https://query2.finance.yahoo.com/v1/test/getcrumb', { 'User-Agent': ua, 'Cookie': cookie });
  yahooCrumb = crumbResp.data;
  yahooCookie = cookie;
  crumbExpiry = Date.now() + 300000;
  return { crumb: yahooCrumb, cookie: yahooCookie };
}

function fetchJSONWithCrumb(url, crumb, cookie) {
  const sep = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${sep}crumb=${encodeURIComponent(crumb)}`;
  return new Promise((resolve, reject) => {
    https.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Cookie': cookie } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
  });
}

const server = http.createServer(async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }

  // Chart proxy
  if (req.url.startsWith('/api/chart/')) {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/${req.url.replace('/api/', '')}`;
    try {
      const data = await fetchJSON(yahooUrl);
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch(e) {
      res.writeHead(500, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Options proxy
  if (req.url.startsWith('/api/options/')) {
    const parts = req.url.split('/api/options/')[1];
    const symbol = parts.split('?')[0].split('/')[0];
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/options/${symbol}${qs}`;
    try {
      const { crumb, cookie } = await getYahooCrumb();
      const data = await fetchJSONWithCrumb(yahooUrl, crumb, cookie);
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch(e) {
      res.writeHead(500, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Subscription check (local dev: always free)
  if (req.url.startsWith('/api/subscription')) {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const userId = urlObj.searchParams.get('userId');
    const user = localUsers[userId];
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      tier: user?.subscription_tier || 'free',
      active: user?.subscription_status === 'active',
      status: user?.subscription_status || 'none',
    }));
    return;
  }

  // Create checkout (local dev: simulate)
  if (req.url === '/api/create-checkout' && req.method === 'POST') {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: '/?session_id=test_session_123' }));
    return;
  }

  // Customer portal (local dev: simulate)
  if (req.url === '/api/customer-portal' && req.method === 'POST') {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: '/' }));
    return;
  }

  // User data sync
  if (req.url.startsWith('/api/user-data') && req.method === 'POST') {
    const body = await readBody(req);
    if (body?.userId) {
      if (!localUsers[body.userId]) localUsers[body.userId] = { subscription_tier: 'free', subscription_status: 'none' };
      Object.assign(localUsers[body.userId], { email: body.email, name: body.name });
    }
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ saved: true, subscription: { tier: 'free', active: false } }));
    return;
  }

  // Options data API
  if (req.url.startsWith('/api/options-data')) {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const action = urlObj.searchParams.get('action');
    let body = null;
    if (req.method === 'POST') body = await readBody(req);

    if (action === 'iv-history') {
      const symbol = (urlObj.searchParams.get('symbol') || '').toUpperCase();
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ symbol, history: (localIVHistory[symbol] || []).slice(0, 365) }));
      return;
    }
    if (action === 'record-iv' && body) {
      const symbol = (body.symbol || '').toUpperCase();
      const today = new Date().toISOString().slice(0, 10);
      if (!localIVHistory[symbol]) localIVHistory[symbol] = [];
      const existing = localIVHistory[symbol].find(r => r.date === today);
      if (existing) {
        existing.avg_iv = body.avg_iv;
        existing.iv_high = Math.max(existing.iv_high || 0, body.iv_high || body.avg_iv);
        existing.iv_low = Math.min(existing.iv_low || 999, body.iv_low || body.avg_iv);
        existing.price = body.price;
      } else {
        localIVHistory[symbol].push({ date: today, avg_iv: body.avg_iv, iv_high: body.iv_high || body.avg_iv, iv_low: body.iv_low || body.avg_iv, price: body.price });
      }
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ recorded: true }));
      return;
    }
    if (action === 'saved') {
      const userId = urlObj.searchParams.get('userId');
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ strategies: localSavedStrategies.filter(s => s.user_id === userId) }));
      return;
    }
    if (action === 'save' && body) {
      const entry = {
        id: savedIdCounter++, user_id: body.userId, symbol: (body.symbol || '').toUpperCase(),
        strategy_name: body.strategy_name, legs: body.legs || [], entry_price: body.entry_price,
        score: body.score, iv_at_entry: body.iv_at_entry, notes: body.notes || '',
        created_at: new Date().toISOString(),
      };
      localSavedStrategies.push(entry);
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ saved: true, id: entry.id }));
      return;
    }
    if (action === 'unsave' && req.method === 'DELETE') {
      const id = parseInt(urlObj.searchParams.get('id'));
      const userId = urlObj.searchParams.get('userId');
      const idx = localSavedStrategies.findIndex(s => s.id === id && s.user_id === userId);
      if (idx >= 0) localSavedStrategies.splice(idx, 1);
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ deleted: true }));
      return;
    }

    res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown action' }));
    return;
  }

  // Static files
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(__dirname, filePath);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end('Forbidden'); return; }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { ...cors, 'Content-Type': contentType });
    res.end(content);
  } catch(e) {
    res.writeHead(404, { ...cors, 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  Options Ranker running at http://localhost:${PORT}\n`);
});
