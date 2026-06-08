# RESILITWIN — Industrial Safety Monitor

> Real-time industrial safety monitoring with multi-machine simulation, 3D Digital Twin visualization, predictive analytics, and an AI assistant via OpenRouter.

![Status](https://img.shields.io/badge/status-active-39ff14?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Node.js-a78bfa?style=flat-square)
![AI](https://img.shields.io/badge/AI-OpenRouter%20%2B%20DeepSeek-10b981?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-94a3b8?style=flat-square)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Hardware Integration](#hardware-integration)
- [API Reference](#api-reference)
- [WebSocket Protocol](#websocket-protocol)
- [Theming](#theming)
- [Troubleshooting](#troubleshooting)

---

## Overview

RESILITWIN is a full-stack industrial safety platform built around a **3D Digital Twin** — a virtual replica of physical industrial assets.

The system:
- **Streams real-time sensor data** (vibration, temperature, voltage, current) for multiple machines
- **Estimates remaining useful life** (RUL) for failure prediction
- **Visualizes machine health** through an interactive 3D model with status-driven animations
- **Generates maintenance insights** via an OpenRouter-routed LLM (default: DeepSeek V3.2)

```
Physical Asset → Sensors → WebSocket Server → Digital Twin → Dashboard + AI
```

---

## Features

### Real-Time Dashboard
- Live sensor cards with color-coded severity (Normal / Warning / Critical)
- Streaming charts showing the last 60 seconds of data
- Alert panel with timestamps, severity badges, and AI-generated alerts
- Anomaly trigger button for testing

### 3D Digital Twin
- Interactive motor model (Three.js)
- Status-driven animations: stable rotation (Normal), accelerated with amber pulse (Warning), aggressive with red flicker (Critical)
- HUD overlays: sensor readouts, wireframe toggle, scan lines, auto-orbit

### Multi-Machine Monitoring
- Three independent machines: **Motor MK7**, **Compressor CX2**, **Pump PX1**
- Each has its own simulation state and sensor characteristics
- Channel-filtered WebSocket broadcasting

### Predictive Analytics
- RUL gauge with visual thresholds
- Failure trend chart with anomaly highlights
- Maintenance recommendations
- CSV/TXT export

### AI Assistant
- Context-aware chatbot with live system snapshots
- Dynamic model detection (auto-displays active model name and status)
- Auto-generated critical alerts with debouncing
- Voice input and session export

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite | SPA with HMR |
| Styling | Vanilla CSS | Custom variables, glassmorphic overlays |
| Charts | Recharts | Time-series plotting |
| 3D | Three.js | WebGL rendering |
| Backend | Node.js + Express | REST + WebSocket server |
| Real-Time | ws | Bidirectional streaming |
| AI | OpenRouter API | LLM integration |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│            React Frontend (Port 3000)            │
│   Dashboard │ 3D Twin │ Analytics │ Device Guide │
└────────────────────┬─────────────────────────────┘
                     │ WebSocket (per-machine channels)
                     ▼
┌──────────────────────────────────────────────────┐
│       Node.js + Express Backend (Port 3001)      │
│   WebSocket Server │ REST API │ AI Chat Route    │
└────────────────────┬─────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
   Simulation    Prediction   OpenRouter
   (per machine)   (RUL)     (DeepSeek)
```

---

## Project Structure

```
resilitwin/
├── package.json                 # Workspace root
├── tsconfig.json
│
├── server/
│   ├── package.json
│   ├── index.js                 # Express + WebSocket server
│   └── .env.example             # Config template
│
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx             # Entry point
        ├── index.css            # All styles
        ├── App.jsx              # Root component, tab routing
        ├── context/
        │   └── ThemeContext.jsx  # Dark/light theme provider
        ├── hooks/
        │   └── useWebSocket.js  # WebSocket hook (per-machine)
        ├── utils/
        │   └── buildSnapshot.js # Snapshot builder for AI context
        ├── components/
        │   ├── Navbar.jsx
        │   ├── StatusBar.jsx    # Sensor stat cards
        │   ├── VibrationChart.jsx
        │   ├── RightPanel.jsx   # Temp/voltage/current charts
        │   ├── AlertPanel.jsx
        │   ├── TwinView3D.jsx   # 3D visualization + HUD
        │   ├── ChatPanel.jsx    # AI assistant sidebar
        │   ├── DiagnosticConsole.jsx
        │   ├── RulGauge.jsx
        │   ├── TrendChart.jsx
        │   ├── MaintenanceBox.jsx
        │   ├── FullAlertLog.jsx
        │   ├── MotorTwin3D.jsx  # Three.js scene builder
        │   └── ScrollReveal.jsx # Intersection Observer wrapper
        └── pages/
            ├── PredictiveAnalytics.jsx
            ├── ConnectDevice.jsx  # Hardware setup guide
            └── SettingsPage.jsx
```

---

## Prerequisites

- **Node.js** v18+
- **OpenRouter API key** (https://openrouter.ai) — optional, required for AI chat

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=deepseek/deepseek-chat-v3.2-exp:free
```

### 3. Run

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | For AI | — | OpenRouter credential |
| `OPENROUTER_MODEL` | No | `deepseek/deepseek-chat-v3.2-exp:free` | Model slug |
| `PORT` | No | `3001` | Backend port |

---

## Hardware Integration

1. Find your PC's local IP (`ipconfig` / `ifconfig`)
2. Update the `SERVER` variable in your device code: `ws://192.168.1.xxx:3001`
3. Both devices must be on the same network; firewall must allow port 3001
4. Toggle **Live Device Mode** in Settings

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/history?machine=Motor%20MK7` | Sensor history (60 points) |
| `GET` | `/api/machine` | Active machine |
| `POST` | `/api/machine` | Set active machine (`{ "machineId": "..." }`) |
| `POST` | `/api/trigger-anomaly` | Spike vibration (`{ "machine": "..." }`) |
| `POST` | `/api/chat` | AI chat (SSE stream) |
| `GET` | `/api/ai-status` | Model name + online status |
| `GET` | `/api/mode` | Live/sim mode state |
| `POST` | `/api/mode` | Toggle live mode (`{ "live": true }`) |

---

## WebSocket Protocol

- **Connect**: `ws://localhost:3001/ws?machine=Motor+MK7`
- **On connect**: Server sends full history as `{ type: "history", data: [...] }`
- **Ongoing**: `{ type: "sensor", data: {...} }` every ~1 second

---

## Theming

Dark mode (default) and light mode, toggled in the navbar or Settings page. Persists to `localStorage`.

- **Dark**: Deep canvas (`#07050d`) with lavender accents (`#a78bfa`)
- **Light**: Light canvas (`#f6f5fa`) with indigo accents (`#6366f1`)

---

## Troubleshooting

### Port 3001 already in use
```bash
# Windows PowerShell
Get-Process -Name node | Stop-Process
```

### AI shows "Offline"
Set `OPENROUTER_API_KEY` in `server/.env` and restart. Verify with:
```bash
curl http://localhost:3001/api/ai-status
```
