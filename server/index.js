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

const SYSTEM_PROMPT_TEMPLATE = `You are ResiliTwin AI, an industrial safety monitoring assistant embedded in a real-time Digital Twin dashboard.

Live system data:
{{SYSTEM_SNAPSHOT}}

Answer questions using actual values from the snapshot — never invent data. Explain sensor readings in practical terms, recommend maintenance actions based on the data, and predict risks. If the status is CRITICAL, lead with a clear warning. Format with **bold** headers, \`code\` for values, and bullet lists.`;

/* ── Sensor simulation state ───────────────────────────── */
const HISTORY_LIMIT  = 60;
const DEVICE_TIMEOUT = 5000;
const MACHINES = ['Motor MK7', 'Compressor CX2', 'Pump PX1'];
let activeMachine = 'Motor MK7';
let liveMode              = false;
let lastDeviceMessageTime = 0;

function clamp(v, mn, mx) { return Math.min(Math.max(v, mn), mx); }
function rand(mn, mx)     { return Math.random() * (mx - mn) + mn; }

const machineStates = {
  'Motor MK7': {
    vibrationBase: 0.5,
    history: [],
    generateSensorData: function() {
      this.vibrationBase += 0.05 + rand(-0.02, 0.02);
      if (this.vibrationBase >= 9.5) this.vibrationBase = 0.5;
      const vibration   = clamp(this.vibrationBase + rand(-0.2, 0.2), 0.5, 9.5);
      const temperature = clamp(60 + rand(-4, 4) + vibration * 0.4, 45, 85);
      const voltage     = clamp(228 + rand(-5, 5), 215, 240);
      const current     = clamp(10.2 + rand(-1.0, 1.0) + vibration * 0.12, 7, 13);
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
  },
  'Compressor CX2': {
    vibrationBase: 2.2,
    history: [],
    generateSensorData: function() {
      this.vibrationBase += 0.08 + rand(-0.04, 0.04);
      if (this.vibrationBase >= 9.8) this.vibrationBase = 1.8;
      const vibration   = clamp(this.vibrationBase + rand(-0.3, 0.3), 1.0, 9.8);
      const temperature = clamp(74 + rand(-6, 6) + vibration * 0.5, 55, 96);
      const voltage     = clamp(226 + rand(-6, 6), 210, 240);
      const current     = clamp(12.8 + rand(-1.5, 1.5) + vibration * 0.18, 9, 16);
      const rul         = Math.round(clamp(100 - (vibration / 9.8) * 100, 0, 100) * 1.1);
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
  },
  'Pump PX1': {
    vibrationBase: 1.2,
    history: [],
    generateSensorData: function() {
      this.vibrationBase += 0.06 + rand(-0.03, 0.03);
      if (this.vibrationBase >= 9.6) this.vibrationBase = 0.8;
      const vibration   = clamp(this.vibrationBase + rand(-0.25, 0.25), 0.8, 9.6);
      const temperature = clamp(68 + rand(-5, 5) + vibration * 0.45, 50, 92);
      const voltage     = clamp(230 + rand(-4, 4), 218, 242);
      const current     = clamp(11.0 + rand(-1.2, 1.2) + vibration * 0.15, 8, 14);
      const rul         = Math.round(clamp(100 - (vibration / 9.6) * 100, 0, 100) * 1.2);
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
  }
};

// Prepopulate histories
for (const m of MACHINES) {
  const state = machineStates[m];
  for (let i = 0; i < HISTORY_LIMIT; i++) {
    const data = state.generateSensorData();
    const time = new Date(Date.now() - (HISTORY_LIMIT - i) * 1000);
    data.timestamp = time.toISOString();
    state.history.push(data);
  }
}

function pushAndBroadcast(machine, data) {
  const state = machineStates[machine];
  if (!state) return;
  state.history.push(data);
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
  const msg = JSON.stringify({ type: 'sensor', data });
  wss.clients.forEach(c => {
    if (c.readyState === 1 && c.machine === machine) {
      c.send(msg);
    }
  });
}

/* ── REST ─────────────────────────────────────────────── */
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.get('/api/ai-status', (_, res) => res.json({
  online:   Boolean(OPENROUTER_API_KEY),
  provider: 'openrouter',
  model:    OPENROUTER_MODEL,
}));
app.get('/api/history', (req, res) => {
  const machine = req.query.machine || activeMachine;
  const state = machineStates[machine] || machineStates['Motor MK7'];
  res.json(state.history);
});

app.get('/api/machine', (_, res) => {
  res.json({ activeMachine });
});

app.post('/api/machine', (req, res) => {
  const { machineId } = req.body;
  if (MACHINES.includes(machineId)) {
    activeMachine = machineId;
    console.log(`Active machine set to ${activeMachine}`);
    res.json({ activeMachine });
  } else {
    res.status(400).json({ error: `Invalid machineId: ${machineId}` });
  }
});

app.get('/api/mode', (_, res) => {
  const active = liveMode && (Date.now() - lastDeviceMessageTime < DEVICE_TIMEOUT);
  res.json({ liveMode, deviceStatus: !liveMode ? 'simulation' : active ? 'connected' : 'disconnected' });
});

app.post('/api/mode', (req, res) => {
  liveMode = Boolean(req.body.live);
  res.json({ liveMode });
});

app.post('/api/trigger-anomaly', (req, res) => {
  const machine = req.body.machine || req.query.machine || activeMachine;
  const state = machineStates[machine];
  if (state) {
    state.vibrationBase = 8.8;
    console.log(`Anomaly triggered — vibration spiked for ${machine}`);
    res.json({ ok: true, message: `Anomaly triggered for ${machine}` });
  } else {
    res.status(400).json({ error: `Invalid machine: ${machine}` });
  }
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

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const machine = params.get('machine') || activeMachine || 'Motor MK7';
  ws.machine = machine;

  const state = machineStates[machine] || machineStates['Motor MK7'];
  if (state.history.length > 0) {
    ws.send(JSON.stringify({ type: 'history', data: state.history }));
  }

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.source) {
        lastDeviceMessageTime = Date.now();
        if (liveMode) {
          const machineData = {
            ...data,
            timestamp: new Date().toISOString(),
          };
          pushAndBroadcast(activeMachine, machineData);
        }
      }
    } catch {}
  });

  ws.on('error', (e) => console.error('WS error:', e.message));
});

setInterval(() => {
  MACHINES.forEach(m => {
    const isActive = (m === activeMachine);
    const isLive = liveMode && (Date.now() - lastDeviceMessageTime < DEVICE_TIMEOUT);
    if (!isActive || !isLive) {
      const data = machineStates[m].generateSensorData();
      pushAndBroadcast(m, data);
    }
  });
}, 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server → http://localhost:${PORT}`));
