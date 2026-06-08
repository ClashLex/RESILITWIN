# ⚙️ DigitalTwin OS — Industrial Safety Monitor

> A full-stack, real-time industrial safety monitoring system powered by IoT simulation, 3D Digital Twin visualization, predictive analytics, and an OpenRouter-routed AI assistant.

![Status](https://img.shields.io/badge/status-inactive-ff0000?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Node.js-06b6d4?style=flat-square)
![AI](https://img.shields.io/badge/AI-OpenRouter%20%2B%20DeepSeek-22c55e?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-94a3b8?style=flat-square)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Features & Modules](#-features--modules)
- [AI Assistant](#-ai-assistant)
- [Hardware Integration](#-hardware-integration)
- [API Reference](#-api-reference)
- [WebSocket Protocol](#-websocket-protocol)
- [Dark / Light Mode](#-dark--light-mode)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌐 Overview

**DigitalTwin OS** is a real-time industrial safety monitoring system built around the concept of a **Digital Twin** — a virtual replica of a physical machine or industrial asset.

The system continuously:
- **Streams sensor data** (vibration, temperature, voltage, current)
- **Predicts failures** using Remaining Useful Life (RUL) estimation
- **Visualizes health** through dashboards and an interactive 3D model
- **Generates intelligence** using an OpenRouter-routed LLM (default: DeepSeek) for alerts and maintenance recommendations

```text
Physical Asset → Sensors → WebSocket Server → Digital Twin → Dashboard + AI Assistant
```

---

## ✨ Features

### 🖥️ Real-Time Dashboard
- **Live sensor cards** with color-coded severity indicators
- **Streaming charts** displaying the last 60 seconds of data
- **Alert panel** with timestamps and severity badges
- **Anomaly triggers** for testing and simulation

### 🔷 3D Digital Twin Visualization
- **Interactive motor model** built with Three.js
- **Status-driven animations**:
  - **NORMAL** → smooth, stable rotation
  - **WARNING** → accelerated motion with amber indicators
  - **CRITICAL** → aggressive motion with red alerts
- **Real-time sensor overlays** on the 3D model

### 📈 Predictive Analytics Engine
- **RUL (Remaining Useful Life) gauge** with visual indicators
- **Failure prediction chart** with trend analysis
- **Automated maintenance recommendations**
- **Exportable alert logs** in CSV format

### 🤖 AI Assistant (OpenRouter)
- **Context-aware chatbot** with live system snapshots
- **Automatic critical alerts** when status turns CRITICAL (30s debounce)
- **Voice input support** for hands-free operation
- **PDF export** for reports and documentation
- **Quick prompt suggestions** for common questions

### 📡 Device Integration
- **Multi-platform support**: Raspberry Pi, ESP32, Arduino + ESP8266
- **Simulation mode** for development and testing
- **Live device mode** for real sensor data
- **Step-by-step hardware guides** with wiring diagrams and sample code

### 🌗 Modern UI & UX
- **Dark / Light mode** with persistent preferences
- **Fully responsive** design for desktop and mobile devices
- **Smooth transitions** and consistent styling
- **Accessibility-first** component design

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|------|-----------|---------|
| **Frontend** | React + Vite | 18.2 / 5.2 |
| **Language** | JavaScript (JSX) | - |
| **Styling** | CSS + CSS Variables | - |
| **Charts** | Recharts | 2.12+ |
| **3D Visualization** | Three.js | 0.163+ |
| **Backend** | Node.js + Express | 4.18+ |
| **Real-Time** | WebSocket (ws) | 8.16+ |
| **AI Integration** | OpenRouter (OpenAI-compatible) | - |
| **Default Model** | DeepSeek V3.2 (free tier) | - |
| **Package Manager** | npm | - |
| **Development** | Nodemon, Vite, npm workspaces | - |

---

## 🧠 Architecture

```
┌─────────────────────────────────────────────────────┐
│                 React Frontend (Port 3000)          │
│         Dashboard | Analytics | Device Guide        │
└────────────────────┬────────────────────────────────┘
                     │ WebSocket
                     ▼
┌─────────────────────────────────────────────────────┐
│      Node.js + Express Backend (Port 3001)         │
│  WebSocket Server | REST API | AI Integration      │
└────────────────────┬────────────────────────────────┘
                     │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
     Simulation   Prediction    OpenRouter
     Engine      Engine        AI Assistant
```

---

## 📁 Project Structure

```
digital-twin/
├── package.json                    # Root workspace config (npm)
├── tsconfig.json                   # TypeScript root config
├── pnpm-workspace.yaml             # (removed — npm workspaces used instead)
│
├── server/                         # Backend (Node.js + Express)
│   ├── package.json
│   ├── index.js                    # Server entry point: sim engine, REST, WS, OpenRouter SSE
│   ├── .env.example                # OpenRouter key + model config template
│   └── .env                        # Environment variables (not committed)
│
├── client/                         # Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx               # Entry point
│       ├── App.jsx                # Root component
│       ├── context/
│       │   └── ThemeContext.jsx    # Dark/Light mode
│       ├── components/
│       │   ├── Navbar.jsx          # Top navigation
│       │   ├── StatusBar.jsx       # Live sensor status
│       │   ├── AlertPanel.jsx      # Alert display
│       │   ├── TwinView3D.jsx      # 3D visualization
│       │   ├── ChatPanel.jsx       # AI assistant
│       │   └── BottomTabBar.jsx    # Tab navigation
│       ├── pages/
│       │   ├── Dashboard.jsx       # Main monitoring view
│       │   ├── Analytics.jsx       # Predictive analytics
│       │   ├── DeviceGuide.jsx     # Hardware integration
│       │   └── Settings.jsx        # Configuration
│       └── styles/
│           └── global.css          # Global styling
│
└── README.md
```

---

## ✅ Prerequisites

- **Node.js** v18 or higher (npm is bundled with Node)
- **OpenRouter API Key** (free tier) — for AI assistant features

No additional package manager required — npm (bundled with Node.js) is used.

To grab an OpenRouter key:
1. Sign up at https://openrouter.ai
2. Visit https://openrouter.ai/keys and create a key
3. Free-tier keys work with `:free` model slugs (e.g. DeepSeek V3.2)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ClashLex/Digital-Twin.git
cd Digital-Twin
```

### 2. Install Dependencies

```bash
npm install
```

Workspace dependencies for `client/` and `server/` are installed automatically.

### 3. Configure Environment Variables

Copy the example file and fill in your key:

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx

# Optional overrides
OPENROUTER_MODEL=deepseek/deepseek-chat-v3.2-exp:free
APP_REFERER=http://localhost:3000
APP_TITLE=DigitalTwin OS
PORT=3001
```

> **Note**: `.env` files should never be committed to version control.

---

## 🔑 Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENROUTER_API_KEY` | Yes (for AI) | OpenRouter API key (`sk-or-v1-...`) | — |
| `OPENROUTER_MODEL`   | No  | Model slug from openrouter.ai/models | `deepseek/deepseek-chat-v3.2-exp:free` |
| `APP_REFERER`        | No  | Site URL sent as `HTTP-Referer` (recommended by OpenRouter) | `http://localhost:3000` |
| `APP_TITLE`          | No  | App name sent as `X-Title` header | `DigitalTwin OS` |
| `PORT`               | No  | Backend server port | `3001` |

The AI assistant gracefully reports "offline" if the key is missing — the rest of the dashboard (sensor stream, 3D twin, analytics) keeps working.

### Frontend (via Vite)

The Vite dev server proxies `/api` and `/ws` to `http://localhost:3001` automatically. No frontend env vars are required.

---

## ▶️ Running the Application

### Development Mode (Recommended)

From the root directory, run both frontend and backend concurrently:

```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:3000 (React + Vite)
- **Backend**: http://localhost:3001 (Node.js + Express)

### Run Separately

If you prefer to run services independently:

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

### Production Build

```bash
npm run build
```

The client produces a static bundle in `client/dist`. The server is plain Node — no build step required. For a single-host deploy, point a reverse proxy (nginx, Caddy, etc.) at the API on port `3001` and serve `client/dist` as static files.

### Deploying Elsewhere

- **Vercel / Netlify (frontend only)**: a `vercel.json` is included that builds the client and rewrites all routes to `index.html`. Set `VITE_API_URL` if the API is hosted on a different origin.
- **Docker / VPS**: run `node server/index.js` (or with `nodemon` for dev) behind a TLS-terminating proxy. Set `OPENROUTER_API_KEY` in the host's environment.
- **Local LAN testing**: `client/vite.config.js` already has `host: true` and `allowedHosts: true`, so the dev server is reachable on `http://<your-lan-ip>:3000` for real device testing.

---

## 📑 Features & Modules

### 1. Dashboard (Main View)
Real-time industrial monitoring interface.

**Components**:
- Live sensor cards (vibration, temperature, voltage, current)
- Multi-sensor streaming charts (60-second history)
- Status bar with health indicators
- Alert panel with recent events and timestamps

**Interactions**:
- Trigger anomalies for testing
- View detailed sensor metrics
- Respond to real-time alerts

### 2. 3D Digital Twin View
Interactive 3D visualization of the monitored asset.

**Features**:
- Drag to rotate, scroll/pinch to zoom
- Motor model with status-driven animations
- Live sensor value overlays
- Status indicators (NORMAL, WARNING, CRITICAL)

**Status Behaviors**:
- **NORMAL**: Steady rotation, green indicator
- **WARNING**: Faster motion, amber lighting
- **CRITICAL**: Aggressive motion, red alerts

### 3. Analytics & Predictive Maintenance
Data-driven insights and failure predictions.

**Metrics**:
- RUL (Remaining Useful Life) gauge
- Failure prediction trend chart
- Maintenance recommendation engine
- Historical alert log with filtering

**Capabilities**:
- Export alert history as CSV
- Trend analysis and forecasting
- Maintenance scheduling recommendations

### 4. Device Integration Guide
Step-by-step hardware onboarding and setup.

**Supported Platforms**:
- Raspberry Pi (with DHT22, SW-420 vibration sensor)
- ESP32 (with analog sensors)
- Arduino + ESP8266 (with DHT11, SW-420)

**Guidance Includes**:
- Wiring diagrams
- Sample code snippets
- Network configuration
- Live mode activation

### 5. Settings & Configuration
User preferences and application settings.

**Options**:
- Dark / Light mode toggle
- Active machine selection
- Live data mode switch (Simulation ↔ Real Device)
- Data reset and cache clearing

---

## 🤖 AI Assistant (OpenRouter)

The assistant is powered by **OpenRouter** — a single API gateway that fronts many LLM providers. The default model is **DeepSeek V3.2 (free tier)**, which you can swap for any OpenAI-compatible model OpenRouter exposes (Qwen, GLM, Kimi, Llama, Mistral, etc.) by setting `OPENROUTER_MODEL` in `server/.env`.

### Capabilities

- **Context-Aware Responses**: Every message includes a live snapshot of the system
- **Health Analysis**: "What is the current system status?"
- **Anomaly Investigation**: "Why is vibration increasing?"
- **Predictive Guidance**: "How many days until failure?"
- **Maintenance Planning**: "What maintenance should be done now?"

### System Context Provided

Each AI request includes:
- Machine name and current mode
- Live sensor values (vibration, temperature, voltage, current)
- Current operational status (NORMAL, WARNING, CRITICAL)
- Recent alert history
- Vibration trend summary
- Predicted failure window (RUL)

### Features

- **Automatic Alerts**: Triggers when system enters CRITICAL state (30s debounce to avoid alert spam)
- **Streaming Responses**: Server-Sent Events stream tokens as they arrive
- **Voice Input**: Hands-free operation support
- **PDF Export**: Save conversations and recommendations as reports
- **Quick Prompts**: Common question templates for quick analysis
- **Model-agnostic**: Swap models with a single env var — no code changes required

### Choosing a Model

Free-tier models on OpenRouter that work well for this use case:

| Model | Slug | Notes |
|-------|------|-------|
| DeepSeek V3.2 | `deepseek/deepseek-chat-v3.2-exp:free` | Default. Strong general reasoning. |
| Qwen 2.5 72B | `qwen/qwen-2.5-72b-instruct:free` | Solid multilingual + technical. |
| GLM 4.5 Air | `z-ai/glm-4.5-air:free` | Lightweight Zhipu model. |
| Kimi K2 | `moonshotai/kimi-k2:free` | Long context, good for verbose reports. |
| Gemini 2.0 Flash | `google/gemini-2.0-flash-exp:free` | Google's free preview. |

> Free-tier models may have rate limits or queued responses during peak hours. OpenRouter's status page lists current availability.

---

## 📡 Hardware Integration

### Step-by-Step Device Connection

#### 1. Find Your PC's Local IP Address

**Windows**:
```bash
ipconfig
```

**macOS / Linux**:
```bash
ifconfig
```

Look for the IPv4 address (e.g., `192.168.x.x`).

#### 2. Update Device Code

Replace `YOUR_PC_IP` in your device code:
```python
# Example for Raspberry Pi
SERVER_IP = "192.168.1.100"
SERVER_PORT = 3001
```

#### 3. Network Requirements

- Device and PC must be on the **same Wi-Fi network**
- Firewall must allow connections on **port 3001**
- Test connectivity: `ping YOUR_PC_IP`

#### 4. Flash & Activate

- Flash the code to your device (Arduino IDE, PlatformIO, etc.)
- Toggle **LIVE MODE** in the Settings page
- Verify connection status in the Dashboard

### Supported Hardware

| Device | Sensors | Protocol | Language |
|--------|---------|----------|----------|
| **Raspberry Pi 4/5** | DHT22, SW-420 | WebSocket (ws) | Python |
| **ESP32** | DHT22, Analog Vibration | WebSocket (ws) | Arduino C++ |
| **Arduino + ESP8266** | DHT11, SW-420 | WebSocket (ws) | Arduino C++ |

### Connection Status Indicators

- 🟢 **Simulation Mode**: Running sensor simulation (development)
- 🔵 **Live Device Connected**: Real-time data from hardware
- 🔴 **Device Disconnected**: Fallback to simulation

### Sample Device Code

Provided in the **Device Guide** tab with:
- Complete wiring diagrams
- Pin configurations
- Sensor initialization code
- WebSocket client implementation
- Connection troubleshooting tips

---

## 🔌 API Reference

### REST Endpoints

| Method | Endpoint | Description | Payload |
|--------|----------|-------------|---------|
| `GET` | `/api/history` | Fetch recent sensor data | Query: `?limit=100` |
| `POST` | `/api/trigger-anomaly` | Spike vibration for testing | `{ "duration": 5000 }` |
| `POST` | `/api/chat` | Send message to AI assistant | `{ "message": "...", "context": {...} }` |
| `POST` | `/api/machine` | Switch active machine | `{ "machineId": "..." }` |

### WebSocket Endpoints

- **Connection**: `ws://localhost:3001`
- **Real-time Updates**: Continuous streaming of sensor data
- **Payload Frequency**: ~1 second intervals

---

## 📡 WebSocket Protocol

### Server → Client Message Format

```json
{
  "timestamp": "2025-01-13T12:00:00Z",
  "vibration": 6.24,
  "temperature": 74.3,
  "voltage": 229.5,
  "current": 11.2,
  "rul": 45.1,
  "status": "WARNING",
  "anomaly": false,
  "source": "simulation"
}
```

### Field Descriptions

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `timestamp` | ISO8601 | - | Server timestamp |
| `vibration` | float | mm/s | Vibration amplitude |
| `temperature` | float | °C | Motor temperature |
| `voltage` | float | V | Supply voltage |
| `current` | float | A | Motor current |
| `rul` | float | days | Remaining useful life |
| `status` | enum | - | NORMAL \| WARNING \| CRITICAL |
| `anomaly` | boolean | - | Anomaly detected flag |
| `source` | string | - | simulation \| esp32 \| raspberry-pi |

### Status Thresholds

| Status | Vibration | RUL | Description |
|--------|-----------|-----|-------------|
| `NORMAL` | < 4.0 mm/s | > 50 days | Healthy operation |
| `WARNING` | 4.0 – 7.0 mm/s | 20 – 50 days | Monitor closely |
| `CRITICAL` | > 7.0 mm/s | < 20 days | Immediate action needed |

### Real Device Messages

Real devices send the same schema with an additional `source` field:
```json
{
  "...": "...",
  "source": "esp32"
}
```

---

## 🌗 Dark / Light Mode

### Features

- **Theme Toggle**: Available in Settings or via Navbar button
- **Persistence**: Theme preference saved in localStorage
- **System Preference**: Detected on first visit (macOS/iOS/Windows)
- **Full Coverage**: Applied across all UI components, charts, and 3D canvas
- **CSS Variables**: Theme-aware styling with custom properties

### Implementation

- Global theme context (`ThemeContext.jsx`)
- CSS variable system for easy theming
- Smooth transitions between modes

---

## 🔧 Troubleshooting

### Dashboard Not Updating

**Symptoms**: Sensor cards show no data, charts are empty

**Solutions**:
1. Verify both servers are running:
   ```bash
   curl http://localhost:3001/api/history
   ```
2. Check browser console (F12) for WebSocket errors
3. Ensure backend is accessible at `http://localhost:3001`
4. Check firewall rules for port 3001
5. Restart both services: `npm run dev`

### 3D View Not Loading

**Symptoms**: Blank canvas, JavaScript errors in console

**Solutions**:
1. Check browser console for Three.js initialization errors
2. Verify the 3D container has a fixed height (check CSS)
3. Switch to another tab and return to remount the component
4. Clear browser cache and reload
5. Ensure WebGL is supported in your browser

### AI Assistant Shows Offline

**Symptoms**: Chat disabled, "Offline" indicator shown

**Solutions**:
1. Verify the OpenRouter key in `server/.env`:
   ```bash
   curl http://localhost:3001/api/ai-status
   ```
   The response should include `"online": true`.
2. Confirm the key works on https://openrouter.ai/keys
3. If the model is returning 429 (rate limit), try a different `OPENROUTER_MODEL` — see the model table above.
4. Restart the server after updating `.env`:
   ```bash
   npm run dev:server
   ```
5. Check the network tab for failed `/api/chat` requests; the response body will contain the upstream error from OpenRouter.

### Device Will Not Connect

**Symptoms**: Live mode shows "disconnected", no sensor data from device

**Solutions**:
1. Use **local IP address** (e.g., `192.168.x.x`), NOT `localhost`
2. Verify device and PC are on **same Wi-Fi network**
3. Test connectivity: `ping YOUR_PC_IP`
4. Check firewall allows port 3001:
   - **Windows**: `netsh advfirewall firewall add rule name="Port 3001" dir=in action=allow protocol=tcp localport=3001`
   - **macOS**: System Preferences → Security & Privacy → Firewall Options
5. Check device logs for WebSocket connection errors
6. Verify correct `SERVER_IP` in device code

### Temperature Shows NaN

**Symptoms**: Temperature value displays as "NaN" in dashboard

**Solutions**:
1. Allow DHT sensors 2-3 seconds to warm up before first read
2. Check sensor wiring and connections
3. Verify correct GPIO/analog pins in device code
4. Test sensor independently with sample code
5. Replace sensor if consistently failing

### High CPU Usage

**Symptoms**: Application running slowly, fans loud, lag in 3D view

**Solutions**:
1. Close other browser tabs and applications
2. Reduce chart history window (currently 60 seconds)
3. Lower 3D animation quality in settings
4. Check for memory leaks in browser DevTools
5. Upgrade browser to latest version

### WebSocket Connection Timeout

**Symptoms**: Connection drops after 30 seconds, frequent reconnects

**Solutions**:
1. Check backend server is running: `curl http://localhost:3001`
2. Verify no firewall/proxy blocking WebSocket
3. Check browser console for connection errors
4. Restart backend service
5. Review server logs for error messages

---

## 🤝 Contributing

We welcome contributions! Follow this workflow:

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clear, descriptive commit messages
- Follow the project's code style
- Add comments for complex logic

### 3. Commit and Push

```bash
git add .
git commit -m "Add: brief description of changes"
git push origin feature/your-feature-name
```

### 4. Create a Pull Request

- Link related issues
- Provide a detailed description of changes
- Request reviews from maintainers

### Code Standards

- **TypeScript**: Use type annotations and interfaces
- **React**: Functional components with hooks
- **Styling**: CSS Variables and BEM naming convention
- **Documentation**: Update README and inline comments

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author & Credits

**Original Author**: Ansil Muhammed N S  
**Organization**: KMEA Engineering College

---

## 🔗 Quick Links

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Model Directory](https://openrouter.ai/models)
- [React Documentation](https://react.dev)
- [Three.js Documentation](https://threejs.org/docs)
- [WebSocket Specification](https://tools.ietf.org/html/rfc6455)
- [Issue Tracker](https://github.com/ClashLex/Digital-Twin/issues)

---

## ⚡ Vision & Roadmap

**DigitalTwin OS — From Reactive → Predictive → Autonomous**

### Current (v1.0)
- ✅ Real-time dashboard
- ✅ 3D visualization
- ✅ RUL prediction
- ✅ OpenRouter AI assistant (model-agnostic)
- ✅ Multi-device support

### Planned (v2.0)
- 📋 Multi-machine monitoring
- 📋 Custom alert thresholds
- 📋 Data export and analytics
- 📋 Mobile app (React Native)
- 📋 Advanced predictive models

### Future (v3.0)
- 🔮 Autonomous maintenance actions
- 🔮 Edge computing with TensorFlow.js
- 🔮 Federated learning across fleets
- 🔮 AR visualization support

---

**Built with ❤️ for industrial safety and predictive maintenance**
