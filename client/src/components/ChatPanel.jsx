import React, { useState, useEffect, useRef, useCallback } from 'react';

const SUGGESTED = [
  '📊 Current status?',
  '🔧 Need maintenance?',
  '📈 Explain vibration',
  '⚠ Last alert cause?',
  '⏱ Days to failure?',
  '🚨 What to do now?',
];

const SENSOR_CHIPS = [
  { key: 'vibration',   icon: '⚡', unit: 'mm/s', question: (v) => `What does a vibration of ${v} mean for this motor?` },
  { key: 'temperature', icon: '🌡', unit: '°C',   question: (v) => `Is a temperature of ${v} normal for this motor?` },
  { key: 'voltage',     icon: '⚙',  unit: 'V',    question: (v) => `What does a voltage reading of ${v} indicate?` },
  { key: 'rul',         icon: '⏱',  unit: 'd',    question: (v) => `The remaining useful life is ${v} — what should I do?` },
];

const DISPLAY_LIMIT = 50;

function getLocalResponse(msg, machine, latest) {
  const s = latest || {};
  const status = s.status || 'NORMAL';
  const vibration = s.vibration || 0.5;
  const temp = s.temperature || 60;
  const voltage = s.voltage || 228;
  const current = s.current || 10.2;
  const rul = s.rul || 100;
  
  const m = msg.toLowerCase();
  
  if (m.includes('status') || m.includes('current')) {
    return `**Current Telemetry for ${machine}**

The system is currently operating in **${status}** state.

**Live Readings:**
- Vibration: \`${vibration} mm/s\`
- Temperature: \`${temp}°C\`
- Voltage: \`${voltage} V\`
- Current: \`${current} A\`
- Remaining Useful Life: \`${rul} Days\`

${status === 'CRITICAL' ? '⚠️ **CRITICAL ALERT**: The system is experiencing severe vibration levels. A technician should be dispatched immediately to prevent catastrophic coupling failure.' : status === 'WARNING' ? '⚠️ **WARNING**: Vibration is elevated. Monitor temperature trends closely over the next few hours.' : '✅ All parameters are within normal operating limits.'}`;
  }
  
  if (m.includes('maintenance') || m.includes('recommend') || m.includes('action') || m.includes('todo') || m.includes('what to do')) {
    return `**Maintenance Analysis & Actions**

**Current RUL:** \`${rul} Days\`
**Health Status:** \`${status}\`

**Recommended Protocols:**
${status === 'CRITICAL'
  ? `- **Action Level 1**: Perform emergency shutdown immediately.\n- **Action Level 2**: Inspect coupling misalignment and check mounting bolts for loose torque.\n- **Action Level 3**: Verify lubrication inside the main bearings.`
  : status === 'WARNING'
  ? `- **Action Level 2**: Schedule non-urgent inspection within 48 hours.\n- **Action Level 3**: Check grease quality and top off if necessary.\n- **Action Level 4**: Perform ultrasonic bearing scan.`
  : `- **Action Level 3**: Continue standard operational monitoring.\n- **Action Level 4**: No corrective actions required at this time. Standard inspection scheduled for next monthly cycle.`
}`;
  }
  
  if (m.includes('vibration') || m.includes('explain') || m.includes('chart')) {
    return `**Vibration Analysis**

The vibration reading is \`${vibration} mm/s\`.

**Threshold Reference Table:**
- **0.0 to 4.0 mm/s**: **Normal** operation. No action required.
- **4.0 to 7.0 mm/s**: **Warning** zone. Transient misalignment or bearing fatigue is likely starting to develop.
- **> 7.0 mm/s**: **Critical** shutdown threshold. Imminent damage to internal windings, seals, or rotor shafts.`;
  }
  
  if (m.includes('failure') || m.includes('days') || m.includes('rul')) {
    return `**Predictive Failure Analysis**

The Remaining Useful Life (RUL) estimator predicts **${rul} days** of nominal operation remaining before bearing degradation exceeds acceptable thresholds.

**Current Indicators:**
- Vibration Trend: \`${vibration > 4 ? 'Rising (Warning/Critical)' : 'Stable'}\`
- Thermal Drift: \`${temp > 75 ? 'Elevated thermal levels detected' : 'Within normal limits'}\`

**Action Plan:**
${rul < 20
  ? `🚨 **URGENT**: Bearing breakdown is imminent. Order replacement components immediately and schedule downtime.`
  : rul < 50
  ? `⚠️ **ADVISORY**: Bearing wear has commenced. Plan for replacement during the next scheduled monthly outage.`
  : `✅ **STABLE**: Bearing life is nominal. Continue routine operation.`
}`;
  }

  return `**ResiliTwin AI Diagnostics (Local Offline Mode)**

I am here to help you monitor and diagnose **${machine}**.

**Current System Telemetry:**
- Health Status: \`${status}\`
- Vibration: \`${vibration} mm/s\`
- Temperature: \`${temp}°C\`
- Remaining Useful Life: \`${rul} Days\`

*Tip: You can ask me about "Current status", "Explain vibration", "Need maintenance?", or "Days to failure" to get tailored troubleshooting steps based on these values.*`;
}

function renderMarkdown(raw) {
  const esc = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const lines = esc.split('\n');
  let html = '', inList = false;
  for (const line of lines) {
    const m = line.match(/^[-•*]\s+(.*)/);
    if (m) {
      if (!inList) { html += '<ul class="chat-md-list">'; inList = true; }
      html += `<li>${applyInline(m[1])}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<span>${applyInline(line)}</span><br>`;
    }
  }
  if (inList) html += '</ul>';
  return html.replace(/(<br>)+$/, '');
}

function applyInline(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>');
}

function TypingDots() {
  return <div className="chat-typing"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div>;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const ts = new Date(msg.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className={`chat-msg-wrap ${isUser ? 'chat-msg-wrap-user' : 'chat-msg-wrap-ai'}`}>
      {!isUser && <div className="chat-avatar">🤖</div>}
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'} ${msg.error ? 'chat-bubble-error' : ''}`}>
        {msg.streaming && msg.content === '' ? <TypingDots />
         : isUser ? <span>{msg.content}</span>
         : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        }
        {msg.streaming && msg.content !== '' && <span className="chat-cursor">▍</span>}
        <div className="chat-msg-ts">{ts}</div>
      </div>
    </div>
  );
}

function AiAlertCard({ alert, onAck }) {
  return (
    <div className="ai-alert-card">
      <div className="ai-alert-header">
        <span className="ai-alert-blink">⚠ AI ALERT</span>
        <button className="ai-alert-ack" onClick={onAck}>Acknowledge</button>
      </div>
      <div className="ai-alert-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(alert.content) }} />
      <div className="ai-alert-ts">{new Date(alert.ts).toLocaleTimeString()}</div>
    </div>
  );
}

export default function ChatPanel({ isOpen, onClose, snapshot, latest, aiAlerts = [], onAckAlert, status, machine }) {
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [isStreaming,   setIsStreaming]    = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);
  const [showMenu,      setShowMenu]      = useState(false);
  const [listening,     setListening]     = useState(false);
  const [showAll,       setShowAll]       = useState(false);
  const [aiStatus,      setAiStatus]      = useState({ online: false, model: '', provider: '' });
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const apiBase = import.meta.env.VITE_BACKEND_URL
    ? `${window.location.protocol}//${import.meta.env.VITE_BACKEND_URL}`
    : '';

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiAlerts]);

  // Focus input on open
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 350); }, [isOpen]);

  // Fetch AI status
  useEffect(() => {
    const fetchAiStatus = async () => {
      try {
        const res = await fetch(`${apiBase}/api/ai-status`);
        if (res.ok) {
          const data = await res.json();
          setAiStatus(data);
          return;
        }
      } catch {}
      setAiStatus({ online: true, model: 'demo-local-ai', provider: 'local' });
    };
    if (isOpen) {
      fetchAiStatus();
    }
  }, [isOpen]);

  const getModelName = () => {
    if (!aiStatus.online) return 'Offline';
    const slug = aiStatus.model || '';
    if (slug.includes('demo-local-ai')) return 'Demo Local AI';
    if (slug.includes('deepseek')) return 'DeepSeek V3.2';
    if (slug.includes('qwen')) return 'Qwen 2.5';
    if (slug.includes('gemini')) return 'Gemini 2.0 Flash';
    if (slug.includes('kimi')) return 'Kimi K2';
    if (slug.includes('glm')) return 'GLM 4.5 Air';
    const parts = slug.split('/');
    const last = parts[parts.length - 1].split(':')[0];
    return last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Auto-dismiss AI alerts after 30s
  useEffect(() => {
    if (!aiAlerts.length) return;
    const ids = aiAlerts.map(a => a.id);
    const t = setTimeout(() => ids.forEach(id => onAckAlert(id)), 30000);
    return () => clearTimeout(t);
  }, [aiAlerts.map(a => a.id).join(',')]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;
    const userMsg = { id: Date.now(), role: 'user', content: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowSuggested(false);
    setIsStreaming(true);
    const aiId = Date.now() + 1;
    setMessages(prev => [...prev, { id: aiId, role: 'ai', content: '', ts: Date.now(), streaming: true }]);

    const runLocalAiStream = () => {
      const fullText = getLocalResponse(msg, machine, latest);
      let index = 0;
      setIsStreaming(true);
      
      const interval = setInterval(() => {
        if (index < fullText.length) {
          const chunk = fullText.slice(index, index + 8);
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + chunk } : m));
          index += 8;
        } else {
          clearInterval(interval);
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m));
          setIsStreaming(false);
        }
      }, 30);
    };

    try {
      const resp = await fetch(`${apiBase}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, systemSnapshot: snapshot }),
        signal: AbortSignal.timeout(18000),
      });

      if (!resp.ok) {
        throw new Error("unreachable");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + data.text } : m));
            if (data.done) { setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m)); setIsStreaming(false); }
            if (data.error) { setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: `⚠ ${data.error}`, streaming: false, error: true } : m)); setIsStreaming(false); }
          } catch {}
        }
      }
    } catch (err) {
      runLocalAiStream();
    }
  }, [input, isStreaming, snapshot, latest, machine]);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false;
    setListening(true);
    rec.onresult = (e) => { setListening(false); sendMessage(e.results[0][0].transcript); };
    rec.onerror  = () => setListening(false);
    rec.onend    = () => setListening(false);
    rec.start();
  };

  const clearChat = () => { setMessages([]); setShowSuggested(true); setShowMenu(false); setShowAll(false); };
  const copyLast  = () => {
    const last = [...messages].reverse().find(m => m.role === 'ai');
    if (last) navigator.clipboard.writeText(last.content);
    setShowMenu(false);
  };
  const exportChat = () => {
    const s = latest ?? {};
    const lines = [
      `ResiliTwin AI Session Report`, `Machine: ${machine ?? 'Motor MK7'}  |  ${new Date().toLocaleString()}`,
      `Status: ${s.status ?? '—'}  |  Vib: ${s.vibration ?? '—'} mm/s  |  Temp: ${s.temperature ?? '—'}°C  |  RUL: ${s.rul ?? '—'}d`,
      '─'.repeat(60), '',
      ...messages.map(m => `[${new Date(m.ts).toLocaleTimeString()}] ${m.role === 'user' ? 'You' : 'AI'}:\n${m.content}\n`),
    ];
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' })),
      download: `resilitwin-chat-${Date.now()}.txt`,
    });
    a.click();
    setShowMenu(false);
  };

  const sensors     = latest ?? {};
  const statusColor = { CRITICAL: 'var(--danger)', WARNING: 'var(--warning)', NORMAL: 'var(--success)' }[status] ?? 'var(--success)';
  const isCritical  = status === 'CRITICAL';
  const msgCount    = messages.length;

  // Virtualize — show last 50 messages
  const displayMessages = !showAll && msgCount > DISPLAY_LIMIT ? messages.slice(-DISPLAY_LIMIT) : messages;
  const hiddenCount     = msgCount > DISPLAY_LIMIT && !showAll ? msgCount - DISPLAY_LIMIT : 0;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="chat-backdrop" onClick={onClose} />}

      <div className={`chat-panel ${isOpen ? 'chat-panel-open' : ''} ${isCritical ? 'chat-panel-critical' : ''}`}>
        {/* Drag handle (mobile) */}
        <div className="chat-drag-handle" onPointerDown={onClose} />

        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <span className="chat-title">🤖 ResiliTwin AI</span>
            <span className="chat-subtitle">
              {aiStatus.online ? `🟢 Powered by ${getModelName()}` : '🔴 AI Offline'}
            </span>
          </div>
          <div className="chat-header-right">
            <div className="chat-status-pill" style={{ borderColor: statusColor, color: statusColor }}>
              <span className="chat-status-dot" style={{ background: statusColor }} />
              {machine ?? 'Motor MK7'} · {status ?? 'NORMAL'}
            </div>
            {msgCount > 0 && <span className="chat-msg-count">{msgCount} msgs</span>}
            <div className="chat-menu-wrap">
              <button className="chat-icon-btn" onClick={() => setShowMenu(m => !m)}>⋯</button>
              {showMenu && (
                <div className="chat-menu">
                  <button onClick={clearChat}>🗑 Clear Chat</button>
                  <button onClick={copyLast} disabled={!messages.some(m => m.role === 'ai')}>📋 Copy Last Response</button>
                  <button onClick={exportChat} disabled={!msgCount}>⬇ Export Chat</button>
                </div>
              )}
            </div>
            <button className="chat-icon-btn chat-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Sensor snapshot strip */}
        <div className="chat-sensor-strip">
          {SENSOR_CHIPS.map(chip => {
            const val = sensors[chip.key];
            const display = val != null ? `${parseFloat(val).toFixed(chip.key === 'rul' ? 0 : 1)}${chip.unit}` : '—';
            return (
              <button key={chip.key} className="chat-chip" title={`Ask about ${chip.key}`}
                onClick={() => { setInput(chip.question(display)); inputRef.current?.focus(); }}>
                <span className="chip-icon">{chip.icon}</span>
                <span className="chip-val">{display}</span>
              </button>
            );
          })}
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {aiAlerts.map(a => <AiAlertCard key={a.id} alert={a} onAck={() => onAckAlert(a.id)} />)}

          {hiddenCount > 0 && (
            <button className="chat-load-earlier" onClick={() => setShowAll(true)}>
              ↑ Load {hiddenCount} earlier messages
            </button>
          )}

          {msgCount === 0 && !aiAlerts.length && (
            <div className="chat-empty">
              <div className="chat-empty-robot">🤖</div>
              <div className="chat-empty-text">Ask me anything about your system</div>
              <div className="chat-empty-sub">I have live access to all sensor data</div>
            </div>
          )}

          {displayMessages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips */}
        {showSuggested && !msgCount && (
          <div className="chat-suggested">
            {SUGGESTED.map(s => (
              <button key={s} className="chat-suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="chat-input-bar">
          <button className={`chat-voice-btn ${listening ? 'chat-voice-active' : ''}`} onClick={startVoice} disabled={isStreaming} title="Voice input">🎤</button>
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about your system…"
            rows={1}
            disabled={isStreaming}
          />
          <button className="chat-send-btn" onClick={() => sendMessage()} disabled={isStreaming || !input.trim()}>
            {isStreaming ? <span className="chat-spinner" /> : '➤'}
          </button>
        </div>
      </div>
    </>
  );
}
