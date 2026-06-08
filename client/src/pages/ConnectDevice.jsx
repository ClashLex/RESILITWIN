import React, { useState, useEffect, useRef } from 'react';
import ScrollReveal from '../components/ScrollReveal.jsx';

/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const DEVICES = [
  { id: 'rpi',     icon: '🍓', name: 'Raspberry Pi',       sub: 'Python + GPIO'   },
  { id: 'esp32',   icon: '📡', name: 'ESP32',               sub: 'Arduino C++'    },
  { id: 'arduino', icon: '🔌', name: 'Arduino + ESP8266',   sub: 'Arduino C++'    },
];

const PIPELINE = [
  { icon: '🌡',  title: 'Physical Sensor', desc: 'SW-420 vibration + DHT22 temperature' },
  { icon: '💻',  title: 'Your Device',      desc: 'Raspberry Pi / ESP32 / Arduino'       },
  { icon: '🔗',  title: 'WebSocket',        desc: 'JSON payload sent every second'       },
  { icon: '⚙',   title: 'This Server',      desc: 'Node.js on port 3001'                 },
  { icon: '📊',  title: 'Dashboard',        desc: 'Charts & alerts update live'          },
];

const WIRING = {
  rpi: {
    device: 'Raspberry Pi',
    power: '3.3V',
    pins: [
      { pin: 'GPIO 17', connects: 'SW-420  Signal', wire: '#06b6d4'  },
      { pin: 'GPIO 4',  connects: 'DHT22   Data',   wire: '#f59e0b'  },
      { pin: '3.3V',    connects: 'VCC  (both)',     wire: '#ef4444'  },
      { pin: 'GND',     connects: 'GND  (both)',     wire: '#94a3b8'  },
    ],
    diagram: [
      { label: 'Raspberry Pi',     x: 0,   color: '#334155', pins: ['GPIO 17 →', 'GPIO 4  →', '3.3V    →', 'GND     →'] },
      { label: 'SW-420 Vibration', x: 1,   color: '#06b6d4', pins: ['← Signal', '—', '← VCC', '← GND'] },
      { label: 'DHT22 Temp',       x: 2,   color: '#f59e0b', pins: ['—', '← Data', '← VCC', '← GND'] },
    ],
  },
  esp32: {
    device: 'ESP32',
    power: '3.3V',
    pins: [
      { pin: 'GPIO 34', connects: 'SW-420  Signal', wire: '#06b6d4'  },
      { pin: 'GPIO 21', connects: 'DHT22   Data',   wire: '#f59e0b'  },
      { pin: '3.3V',    connects: 'VCC  (both)',     wire: '#ef4444'  },
      { pin: 'GND',     connects: 'GND  (both)',     wire: '#94a3b8'  },
    ],
    diagram: [
      { label: 'ESP32',            x: 0,   color: '#334155', pins: ['GPIO 34 →', 'GPIO 21 →', '3.3V    →', 'GND     →'] },
      { label: 'SW-420 Vibration', x: 1,   color: '#06b6d4', pins: ['← Signal', '—', '← VCC', '← GND'] },
      { label: 'DHT22 Temp',       x: 2,   color: '#f59e0b', pins: ['—', '← Data', '← VCC', '← GND'] },
    ],
  },
  arduino: {
    device: 'Arduino + ESP8266',
    power: '5V',
    pins: [
      { pin: 'D2',          connects: 'SW-420  Signal',    wire: '#06b6d4' },
      { pin: 'D3',          connects: 'DHT11   Data',      wire: '#f59e0b' },
      { pin: 'RX (pin 0)',  connects: 'ESP8266 TX',        wire: '#a78bfa' },
      { pin: '5V',          connects: 'VCC  (all)',         wire: '#ef4444' },
      { pin: 'GND',         connects: 'GND  (all)',         wire: '#94a3b8' },
    ],
    diagram: [
      { label: 'Arduino',          x: 0,   color: '#334155', pins: ['D2     →', 'D3     →', 'RX     ←', '5V     →', 'GND    →'] },
      { label: 'SW-420 Vibration', x: 1,   color: '#06b6d4', pins: ['← Signal', '—', '—', '← VCC', '← GND'] },
      { label: 'DHT11 Temp',       x: 2,   color: '#f59e0b', pins: ['—', '← Data', '—', '← VCC', '← GND'] },
      { label: 'ESP8266',          x: 3,   color: '#a78bfa', pins: ['—', '—', '→ TX', '← VCC', '← GND'] },
    ],
  },
};

const DEPS = {
  rpi: {
    lang: 'bash',
    code: `# Install Python libraries
pip install websockets RPi.GPIO adafruit-circuitpython-dht

# Verify GPIO access (may need sudo)
python3 -c "import RPi.GPIO; print('GPIO OK')"`,
  },
  esp32: {
    lang: 'text',
    code: `Arduino IDE → Tools → Manage Libraries…

  ✦ DHT sensor library        by Adafruit        (v1.4.6+)
  ✦ ArduinoWebsockets         by Gil Maimon       (v0.5.3+)
  ✦ ArduinoJson               by Benoit Blanchon  (v6.21+)

Board Manager → Search "esp32" → Install "esp32 by Espressif"
Board:  ESP32 Dev Module
Upload Speed:  921600`,
  },
  arduino: {
    lang: 'text',
    code: `Arduino IDE → Tools → Manage Libraries…

  ✦ DHT sensor library        by Adafruit        (v1.4.6+)
  ✦ WebSockets                by Markus Sattler   (v2.4.0+)
  ✦ ArduinoJson               by Benoit Blanchon  (v6.21+)
  ✦ SoftwareSerial            (built-in)

Board Manager → Search "esp8266" → Install "esp8266 by ESP8266 Community"
Board:  Generic ESP8266 Module  |  Upload Speed: 115200`,
  },
};

const CODE = {
  rpi: {
    lang: 'python',
    code: `import asyncio, websockets, json, random, time
import RPi.GPIO as GPIO
import Adafruit_DHT

SERVER_URI   = "ws://YOUR_PC_IP:3001"
DHT_PIN      = 4
VIB_PIN      = 17
SENSOR       = Adafruit_DHT.DHT22

GPIO.setmode(GPIO.BCM)
GPIO.setup(VIB_PIN, GPIO.IN)

async def stream_sensors():
    async with websockets.connect(SERVER_URI) as ws:
        print("Connected to Digital Twin server")
        while True:
            humidity, temperature = Adafruit_DHT.read_retry(SENSOR, DHT_PIN)
            vibration  = 1.0 if GPIO.input(VIB_PIN) else 0.2
            voltage    = round(random.uniform(218, 235), 1)
            current    = round(random.uniform(9, 14), 1)
            rul        = round(max(0, 100 - vibration * 10), 1)
            status     = ("CRITICAL" if vibration > 7
                          else "WARNING" if vibration > 4
                          else "NORMAL")

            payload = {
                "timestamp":   time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "vibration":   round(vibration, 2),
                "temperature": round(temperature, 1) if temperature else 72.0,
                "voltage":     voltage,
                "current":     current,
                "rul":         rul,
                "status":      status,
                "anomaly":     vibration > 7,
                "source":      "raspberry-pi",
            }
            await ws.send(json.dumps(payload))
            print(f"Sent: {status} | vib={vibration:.2f} | temp={temperature:.1f}°C")
            await asyncio.sleep(1)

asyncio.run(stream_sensors())`,
  },
  esp32: {
    lang: 'cpp',
    code: `#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";
const char* SERVER    = "ws://YOUR_PC_IP:3001";

#define DHT_PIN  21
#define VIB_PIN  34
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);
using namespace websockets;
WebsocketsClient client;
bool wsConnected = false;

void setup() {
  Serial.begin(115200);
  pinMode(VIB_PIN, INPUT);
  dht.begin();
  delay(2000);  // DHT warmup

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nConnected: " + WiFi.localIP().toString());

  client.onMessage([](WebsocketsMessage msg) {});
  client.onEvent([](WebsocketsEvent ev, String data) {
    wsConnected = (ev == WebsocketsEvent::ConnectionOpened);
  });
  wsConnected = client.connect(SERVER);
  if (wsConnected) Serial.println("WebSocket connected to Digital Twin");
}

void loop() {
  client.poll();
  static unsigned long lastSend = 0;
  if (millis() - lastSend < 1000) return;
  lastSend = millis();

  if (!wsConnected) { wsConnected = client.connect(SERVER); return; }

  float temp = dht.readTemperature();
  float vib  = analogRead(VIB_PIN) / 4095.0f * 9.5f;
  float volt = 218.0f + random(0, 170) / 10.0f;
  float curr = 9.0f   + random(0,  50) / 10.0f;
  float rul  = max(0.0f, 100.0f - vib * 10.0f);

  const char* status = vib > 7 ? "CRITICAL" : vib > 4 ? "WARNING" : "NORMAL";

  StaticJsonDocument<256> doc;
  doc["timestamp"]   = "2025-01-01T00:00:00Z";
  doc["vibration"]   = serialized(String(vib, 3));
  doc["temperature"] = isnan(temp) ? 72.0 : temp;
  doc["voltage"]     = serialized(String(volt, 1));
  doc["current"]     = serialized(String(curr, 2));
  doc["rul"]         = (int)rul;
  doc["status"]      = status;
  doc["anomaly"]     = vib > 7;
  doc["source"]      = "esp32";

  String out; serializeJson(doc, out);
  client.send(out);
  Serial.printf("Sent: %s | vib=%.2f temp=%.1f\\n", status, vib, temp);
}`,
  },
  arduino: {
    lang: 'cpp',
    code: `#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID  = "YOUR_WIFI";
const char* WIFI_PASS  = "YOUR_PASSWORD";
const char* SERVER_IP  = "YOUR_PC_IP";
const int   SERVER_PORT = 3001;

#define DHT_PIN  3   // D3
#define VIB_PIN  4   // D2
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);
WebSocketsClient ws;
bool wsConnected = false;

void wsEvent(WStype_t type, uint8_t* payload, size_t len) {
  switch (type) {
    case WStype_CONNECTED:    wsConnected = true;  Serial.println("WS Connected");    break;
    case WStype_DISCONNECTED: wsConnected = false; Serial.println("WS Disconnected"); break;
    default: break;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(VIB_PIN, INPUT);
  dht.begin();
  delay(2000);  // DHT warmup

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nWiFi IP: " + WiFi.localIP().toString());

  ws.begin(SERVER_IP, SERVER_PORT, "/");
  ws.onEvent(wsEvent);
  ws.setReconnectInterval(3000);
}

void loop() {
  ws.loop();
  static unsigned long lastSend = 0;
  if (millis() - lastSend < 1000 || !wsConnected) return;
  lastSend = millis();

  float temp   = dht.readTemperature();
  int   rawVib = digitalRead(VIB_PIN);
  float vib    = rawVib ? 1.0f + random(0, 30) / 10.0f : 0.2f + random(0, 10) / 100.0f;
  float volt   = 218.0f + random(0, 170) / 10.0f;
  float curr   = 9.0f   + random(0,  50) / 10.0f;
  float rul    = max(0.0f, 100.0f - vib * 10.0f);
  const char* status = vib > 7 ? "CRITICAL" : vib > 4 ? "WARNING" : "NORMAL";

  StaticJsonDocument<256> doc;
  doc["timestamp"]   = "2025-01-01T00:00:00Z";
  doc["vibration"]   = serialized(String(vib, 3));
  doc["temperature"] = isnan(temp) ? 72.0f : temp;
  doc["voltage"]     = serialized(String(volt, 1));
  doc["current"]     = serialized(String(curr, 2));
  doc["rul"]         = (int)rul;
  doc["status"]      = status;
  doc["anomaly"]     = vib > 7;
  doc["source"]      = "arduino-esp8266";

  String out; serializeJson(doc, out);
  ws.sendTXT(out);
  Serial.printf("Sent: %s | vib=%.2f temp=%.1f\\n", status, vib, temp);
}`,
  },
};

const SETUP_STEPS = [
  { n: '01', title: 'Find your PC\'s local IP',   cmd: 'ipconfig',              note: 'Windows → IPv4 Address   |   Mac/Linux → ifconfig or ip addr' },
  { n: '02', title: 'Replace YOUR_PC_IP in code', cmd: null,                    note: 'Example: ws://192.168.1.42:3001  (must be on same WiFi)' },
  { n: '03', title: 'Same network check',          cmd: null,                    note: 'Both your PC and device must be on the same WiFi router' },
  { n: '04', title: 'Flash code to device',        cmd: null,                    note: 'Open Serial Monitor at 115200 baud to see connection status' },
  { n: '05', title: 'Toggle LIVE MODE on',         cmd: null,                    note: 'Use the SIM → LIVE switch in the top navbar — charts go live!' },
];

const FAQ = [
  { q: 'Dashboard not updating?',           a: 'Check PC firewall allows port 3001. On Windows: Control Panel → Windows Defender Firewall → Allow an App → add Node.js. Try disabling firewall temporarily to test.' },
  { q: 'ESP32 not connecting to WiFi?',     a: 'ESP32 only supports 2.4 GHz networks — it cannot connect to 5 GHz. Double-check your SSID and password. Avoid special characters in passwords.' },
  { q: 'Temperature reading NaN?',          a: 'DHT sensors require a 2-second warmup after power-on. Ensure delay(2000) is in setup() before the first read. Also verify data pin wiring and pull-up resistor (10kΩ recommended).' },
  { q: 'WebSocket connection refused?',     a: 'Use ws://192.168.x.x:3001 — not ws://localhost:3001. "localhost" refers to the device itself, not your PC. Confirm the Node.js server is running with "npm run dev" in the /server folder.' },
  { q: 'Data looks wrong / random values?', a: 'Verify sensor wiring matches the pin diagram above. Check power supply — DHT22 needs stable 3.3V. Vibration sensor SW-420 sensitivity can be adjusted with its onboard potentiometer.' },
];

/* ══════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════ */
function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className={`copy-btn ${copied ? 'copy-done' : ''}`} onClick={handleCopy}>
      {copied ? '✓ Copied!' : `📋 ${label}`}
    </button>
  );
}

function CodeBlock({ code, lang, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.hljs) {
      ref.current.removeAttribute('data-highlighted');
      window.hljs.highlightElement(ref.current);
    }
  }, [code, lang]);

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-lang-badge">{lang}</span>
        {label && <span className="code-label">{label}</span>}
        <CopyButton text={code} label="Copy Code" />
      </div>
      <div className="code-scroll">
        <pre className="hljs-block"><code ref={ref} className={`language-${lang}`}>{code}</code></pre>
      </div>
    </div>
  );
}

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`accordion-item ${open ? 'accordion-open' : ''}`}>
      <button className="accordion-header" onClick={() => setOpen(o => !o)}>
        <span className="accordion-arrow">{open ? '▼' : '▶'}</span>
        <span className="accordion-q">{q}</span>
      </button>
      <div className="accordion-body" style={{ maxHeight: open ? '200px' : '0' }}>
        <div className="accordion-content">{a}</div>
      </div>
    </div>
  );
}

function SectionHeader({ n, title }) {
  return (
    <div className="section-header">
      <span className="section-num">{n}</span>
      <h2 className="section-title">{title}</h2>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function ConnectDevice() {
  const [device, setDevice] = useState('rpi');
  const wiring = WIRING[device];
  const deps   = DEPS[device];
  const code   = CODE[device];

  return (
    <div className="device-guide-page">

      {/* ── SECTION 1: Device Selector ── */}
      <ScrollReveal direction="up" delay={0}>
      <section className="guide-section">
        <SectionHeader n="01" title="Select Your Device" />
        <div className="device-card-grid">
          {DEVICES.map(d => (
            <button
              key={d.id}
              className={`device-card ${device === d.id ? 'device-card-active' : ''}`}
              onClick={() => setDevice(d.id)}
            >
              <span className="device-icon">{d.icon}</span>
              <span className="device-name">{d.name}</span>
              <span className="device-sub">{d.sub}</span>
              {device === d.id && <span className="device-check">✓</span>}
            </button>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ── SECTION 2: Pipeline ── */}
      <ScrollReveal direction="up" delay={80}>
      <section className="guide-section">
        <SectionHeader n="02" title="How It Works" />
        <div className="pipeline-scroll">
          <div className="pipeline-flow">
            {PIPELINE.map((step, i) => (
              <React.Fragment key={i}>
                <div className="pipeline-step">
                  <div className="pipeline-icon">{step.icon}</div>
                  <div className="pipeline-step-title">{step.title}</div>
                  <div className="pipeline-step-desc">{step.desc}</div>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className="pipeline-arrow-wrap">
                    <div className="pipeline-arrow">→</div>
                    <div className="pipeline-arrow-line" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ── SECTION 3: Wiring Guide ── */}
      <ScrollReveal direction="up" delay={80}>
      <section className="guide-section">
        <SectionHeader n="03" title={`Wiring Guide — ${wiring.device}`} />

        {/* CSS Wiring Diagram */}
        <div className="wiring-diagram">
          {wiring.diagram.map((box, bi) => (
            <React.Fragment key={bi}>
              <div className="wiring-box" style={{ borderColor: box.color }}>
                <div className="wiring-box-label" style={{ background: box.color }}>{box.label}</div>
                {box.pins.map((p, pi) => (
                  <div key={pi} className="wiring-pin-row">
                    <span className="wiring-pin-text">{p}</span>
                  </div>
                ))}
              </div>
              {bi < wiring.diagram.length - 1 && (
                <div className="wiring-connector">
                  {box.pins.map((_, pi) => (
                    <div key={pi} className="wiring-wire"
                      style={{ background: wiring.pins[pi]?.wire ?? '#334155' }} />
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Pin Table */}
        <table className="pin-table">
          <thead>
            <tr><th>PIN</th><th>CONNECTS TO</th><th>WIRE COLOR</th></tr>
          </thead>
          <tbody>
            {wiring.pins.map((p, i) => (
              <tr key={i}>
                <td><code className="pin-code">{p.pin}</code></td>
                <td>{p.connects}</td>
                <td><span className="wire-dot" style={{ background: p.wire }} />{p.wire}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      </ScrollReveal>

      {/* ── SECTION 4: Dependencies ── */}
      <ScrollReveal direction="up" delay={80}>
      <section className="guide-section">
        <SectionHeader n="04" title="Install Dependencies" />
        <CodeBlock code={deps.code} lang={deps.lang} label="Install" />
      </section>
      </ScrollReveal>

      {/* ── SECTION 5: Device Code ── */}
      <ScrollReveal direction="up" delay={80}>
      <section className="guide-section">
        <SectionHeader n="05" title={`Device Code — ${DEVICES.find(d => d.id === device)?.name}`} />
        <div className="code-hint">
          Replace <code className="inline-code">YOUR_PC_IP</code>, <code className="inline-code">YOUR_WIFI</code>,
          and <code className="inline-code">YOUR_PASSWORD</code> before flashing.
        </div>
        <CodeBlock code={code.code} lang={code.lang} label="Flash this to your device" />
      </section>
      </ScrollReveal>

      {/* ── SECTION 6: Server Setup ── */}
      <ScrollReveal direction="up" delay={80}>
      <section className="guide-section">
        <SectionHeader n="06" title="Server Setup & Going Live" />
        <div className="setup-note">
          The server automatically handles both <strong>simulation mode</strong> (demo data)
          and <strong>live device mode</strong> (real sensor data). Use the <strong>SIM → LIVE</strong> toggle
          in the navbar to switch.
        </div>
        <div className="setup-steps">
          {SETUP_STEPS.map((s) => (
            <div key={s.n} className="setup-step">
              <div className="setup-step-num">{s.n}</div>
              <div className="setup-step-body">
                <div className="setup-step-title">{s.title}</div>
                {s.cmd && (
                  <div className="setup-cmd-row">
                    <code className="setup-cmd">{s.cmd}</code>
                    <CopyButton text={s.cmd} label="Copy" />
                  </div>
                )}
                <div className="setup-step-note">{s.note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ── SECTION 7: Connection Status Reference ── */}
      <ScrollReveal direction="up" delay={80}>
      <section className="guide-section">
        <SectionHeader n="07" title="Connection Status Indicators" />
        <div className="status-ref-grid">
          {[
            { dot: 'dot-sim',  color: '#22c55e', label: 'Simulation',      desc: 'Demo mode — server generates synthetic sensor data' },
            { dot: 'dot-live', color: '#06b6d4', label: 'Live Device',      desc: 'Real hardware connected and streaming data live' },
            { dot: 'dot-err',  color: '#ef4444', label: 'Device Disconnected', desc: 'Live mode ON but no device message in last 5 seconds' },
          ].map(s => (
            <div key={s.label} className="status-ref-card">
              <div className="status-ref-top">
                <span className={`status-dot ${s.dot}`} />
                <span style={{ color: s.color, fontWeight: 700, fontSize: '0.85rem' }}>{s.label}</span>
              </div>
              <div className="status-ref-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ── SECTION 8: Troubleshooting ── */}
      <ScrollReveal direction="up" delay={80}>
      <section className="guide-section">
        <SectionHeader n="08" title="Troubleshooting" />
        <div className="accordion">
          {FAQ.map((item, i) => <AccordionItem key={i} q={item.q} a={item.a} />)}
        </div>
      </section>
      </ScrollReveal>

    </div>
  );
}
