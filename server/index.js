const express  = require('express');
const cors     = require('cors');
const http     = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

/* ── OpenRouter client ─────────────────────────────────── */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.2-exp:free';
const OPENROUTER_URL     = 'https://openrouter.ai/api/v1/chat/completions';
const APP_REFERER        = process.env.APP_REFERER || 'http://localhost:3000';
const APP_TITLE          = process.env.APP_TITLE   || 'RESILITWIN OS';

const SYSTEM_PROMPT_TEMPLATE = `You are ResiliTwin AI, an expert industrial safety monitoring assistant integrated into a real-time Digital Twin dashboard for an industrial motor system.

You have access to the following LIVE system data:
{{SYSTEM_SNAPSHOT}}

Your job:
- Answer questions about the machine's current health using actual values from the snapshot
- Explain what sensor readings mean in practical terms
- Give maintenance recommendations based on real data
- Predict risks and suggest concrete actions
- If status is CRITICAL, always open with a prominent warning
- Use **bold** for headers, \`code\` for values, and bullet points for lists
- Never invent data — only use what is in the snapshot`;

/* ── Sensor simulation state ───────────────────────────── */
const HISTORY_LIMIT  = 60;
const DEVICE_TIMEOUT = 5000;
const history = [];
let vibrationBase         = 0.5;
let liveMode              = false;
let lastDeviceMessageTime = 0;

function clamp(v, mn, mx) { return Math.min(Math.max(v, mn), mx); }
function rand(mn, mx)     { return Math.random() * (mx - mn) + mn; }

function generateSensorData() {
  vibrationBase += 0.05 + rand(-0.02, 0.02);
  if (vibrationBase >= 9.5) vibrationBase = 0.5;
  const vibration   = clamp(vibrationBase + rand(-0.2, 0.2), 0.5, 9.5);
  const temperature = clamp(70 + rand(-5, 5) + vibration * 0.4, 55, 95);
  const voltage     = clamp(225 + rand(-7.5, 7.5), 210, 240);
  const current     = clamp(11.5 + rand(-1.5, 1.5) + vibration * 0.15, 8, 15);
  const rul         = Math.round(clamp(100 - (vibration / 9.5) * 100, 0, 100) * 1.2);
  const status      = vibration > 7 ? 'CRITICAL' : vibration >= 4 ? 'WARNING' : 'NORMAL';
  return {
    timestamp:   new Date().toISOString(),
    vibration:   parseFloat(vibration.toFixed(3)),
    temperature: parseFloat(temperature.toFixed(2)),
    voltage:     parseFloat(voltage.toFixed(2)),
    current:     parseFloat(current.toFixed(3)),
    rul, status,
    anomaly: vibration > 7,
  };
}

function pushAndBroadcast(data) {
  history.push(data);
  if (history.length > HISTORY_LIMIT) history.shift();
  const msg = JSON.stringify({ type: 'sensor', data });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

/* ── REST ─────────────────────────────────────────────── */
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.get('/api/ai-status', (_, res) => res.json({
  online:   Boolean(OPENROUTER_API_KEY),
  provider: 'openrouter',
  model:    OPENROUTER_MODEL,
}));
app.get('/api/history', (_, res) => res.json(history));

app.get('/api/mode', (_, res) => {
  const active = liveMode && (Date.now() - lastDeviceMessageTime < DEVICE_TIMEOUT);
  res.json({ liveMode, deviceStatus: !liveMode ? 'simulation' : active ? 'connected' : 'disconnected' });
});

app.post('/api/mode', (req, res) => {
  liveMode = Boolean(req.body.live);
  res.json({ liveMode });
});

app.post('/api/trigger-anomaly', (_, res) => {
  vibrationBase = 8.8;
  console.log('Anomaly triggered — vibration spiked to critical');
  res.json({ ok: true, message: 'Anomaly triggered' });
});

/* ── OpenRouter chat (SSE streaming) ───────────────────── */
app.post('/api/chat', async (req, res) => {
  const { message, systemSnapshot } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  if (!OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured on the server.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
    '{{SYSTEM_SNAPSHOT}}',
    JSON.stringify(systemSnapshot || {}, null, 2)
  );

  const send = (obj) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`); };
  const timer = setTimeout(() => { send({ error: 'Request timed out after 30 seconds.' }); res.end(); }, 30000);

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  APP_REFERER,
        'X-Title':       APP_TITLE,
      },
      body: JSON.stringify({
        model:      OPENROUTER_MODEL,
        stream:     true,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: message   },
        ],
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    send({ error: `OpenRouter request failed: ${err.message || 'network error'}` });
    return res.end();
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer);
    let detail = `OpenRouter returned HTTP ${upstream.status}`;
    try { const j = await upstream.json(); detail = j?.error?.message || j?.message || detail; } catch {}
    send({ error: detail });
    return res.end();
  }

  const reader  = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) send({ text: delta });
        } catch {}
      }
    }
    clearTimeout(timer);
    send({ done: true });
    res.end();
  } catch (err) {
    clearTimeout(timer);
    send({ error: err.message || 'Stream interrupted' });
    res.end();
  }
});

/* ── WebSocket ────────────────────────────────────────── */
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  if (history.length > 0) ws.send(JSON.stringify({ type: 'history', data: history }));

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.source) {
        lastDeviceMessageTime = Date.now();
        if (liveMode) pushAndBroadcast(data);
      }
    } catch {}
  });

  ws.on('error', (e) => console.error('WS error:', e.message));
});

setInterval(() => { if (!liveMode) pushAndBroadcast(generateSensorData()); }, 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server → http://localhost:${PORT}`));
