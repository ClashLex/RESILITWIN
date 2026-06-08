import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* ══════════════════════════════════════════════════════════
   CSS-VAR BRIDGE  (Apple tokens → 3D scene)
   Reads the same design tokens that drive the rest of the app,
   so the 3D canvas always matches the active theme.
   ══════════════════════════════════════════════════════════ */
function readVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ══════════════════════════════════════════════════════════
   ERROR BOUNDARY
   ══════════════════════════════════════════════════════════ */
class TwinErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%',
          color: '#94a3b8', gap: '12px', background: 'var(--bg-card)',
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 48 }}>⚙</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>3D view failed to load.</p>
          <button
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600,
            }}
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const STATUS_COLOR = { NORMAL: '#1d8a4a', WARNING: '#b45309', CRITICAL: '#c81e1e' };
const STATUS_LIGHT = { NORMAL: '#1d8a4a', WARNING: '#b45309', CRITICAL: '#c81e1e' };
const STATUS_SPEED = { NORMAL: 1.0,       WARNING: 2.5,       CRITICAL: 5.0 };
const PULSE_CFG    = {
  NORMAL:   { freq: 1.0, min: 0.0, max: 0.3 },
  WARNING:  { freq: 2.0, min: 0.1, max: 0.6 },
  CRITICAL: { freq: 4.0, min: 0.3, max: 1.0 },
};

/* ══════════════════════════════════════════════════════════
   INNER COMPONENT
══════════════════════════════════════════════════════════ */
function TwinView3DInner({ sensorData, status = 'NORMAL', theme = 'dark', machine = 'Motor MK7' }) {
  const mountRef      = useRef(null);
  const sceneRef      = useRef(null);
  const animFrameRef  = useRef(null);
  const statusRef     = useRef(status);
  const hintTimerRef  = useRef(null);

  const [loaded,       setLoaded]       = useState(false);
  const [showHint,     setShowHint]     = useState(true);
  const [wireframe,    setWireframe]    = useState(false);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [callouts,     setCallouts]     = useState(true);

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  /* ── Fade hint after 4s on mount ───────────────────── */
  useEffect(() => {
    hintTimerRef.current = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(hintTimerRef.current);
  }, []);

  const flashHint = () => {
    setShowHint(true);
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShowHint(false), 4000);
  };

  /* ── Wireframe toggle ───────────────────────────────── */
  useEffect(() => {
    const r = sceneRef.current;
    if (!r) return;
    r.scene.traverse(obj => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { m.wireframe = wireframe; });
      }
    });
  }, [wireframe]);

  /* ── Orbit toggle ──────────────────────────────────── */
  useEffect(() => {
    const r = sceneRef.current;
    if (r) r.orbitEnabled = orbitEnabled;
  }, [orbitEnabled]);

  /* ── Theme update (no remount) ─────────────────────── */
  useEffect(() => {
    const r = sceneRef.current;
    if (!r) return;
    const dark = theme === 'dark';
    const bg   = readVar('--color-canvas') || (dark ? '#06080d' : '#f4f5f8');
    r.scene.background.set(bg);
    r.scene.fog.color.set(bg);
    r.ambientLight.color.set(dark ? '#0c1017' : '#ffffff');
    r.ambientLight.intensity = dark ? 0.8 : 1.2;
    r.hemiLight.color.set(dark ? '#030507' : '#ffffff');
  }, [theme]);

  /* ── Status + sensor update (no remount) ───────────── */
  useEffect(() => {
    statusRef.current = status;
    const r = sceneRef.current;
    if (!r) return;
    const col = STATUS_COLOR[status] ?? STATUS_COLOR.NORMAL;
    r.bearings?.forEach(b => {
      b.material.color.set(col);
      b.material.emissive.set(col);
    });
    if (r.statusLight) {
      r.statusLight.color.set(STATUS_LIGHT[status] ?? STATUS_LIGHT.NORMAL);
      r.statusLight.intensity = status === 'CRITICAL' ? 3.0 : status === 'WARNING' ? 2.0 : 1.5;
    }
    r.rotationSpeed = STATUS_SPEED[status] ?? 1.0;
    const pc = PULSE_CFG[status] ?? PULSE_CFG.NORMAL;
    r.pulseFreq = pc.freq; r.pulseMin = pc.min; r.pulseMax = pc.max;
  }, [status, sensorData]);

  /* ── Main Three.js setup ────────────────────────────── */
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth  || 600;
    const h = container.clientHeight || 400;

    /* ── Renderer ───────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    /* ── Scene ──────────────────────────────────────── */
    const dark  = theme === 'dark';
    const bgCol = readVar('--color-canvas') || (dark ? '#000000' : '#f5f5f7');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgCol);
    scene.fog = new THREE.Fog(bgCol, 20, 60);

    /* ── Camera ─────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(6, 4, 8);
    camera.lookAt(0, 0, 0);

    /* ── Lights ─────────────────────────────────────── */
    const ambientLight = new THREE.AmbientLight(
      dark ? '#1a1a1c' : '#ffffff', dark ? 0.8 : 1.2
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.5);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width  = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const accentLight = new THREE.PointLight(readVar('--color-primary') || '#0066cc', 2.0, 20);
    accentLight.position.set(-4, 3, 4);
    scene.add(accentLight);

    const hemiLight = new THREE.HemisphereLight(
      dark ? '#000000' : '#ffffff', readVar('--color-primary') || '#0066cc', 0.5
    );
    scene.add(hemiLight);

    const statusLight = new THREE.PointLight(readVar('--color-status-normal') || '#1d8a4a', 1.5, 20);
    statusLight.position.set(0, 5, 0);
    scene.add(statusLight);

    /* ── Motor Group ────────────────────────────────── */
    const motorGroup = new THREE.Group();
    motorGroup.position.set(0, 0, 0);
    scene.add(motorGroup);

    /* Motor body — cylinder, horizontal (axis along X) */
    const bodyMat = new THREE.MeshStandardMaterial({
      color: dark ? '#2d3748' : '#64748b', roughness: 0.7, metalness: 0.35,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3, 32), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    motorGroup.add(body);

    /* End caps */
    const capMat = new THREE.MeshStandardMaterial({
      color: dark ? '#374151' : '#6b7280', roughness: 0.6, metalness: 0.4,
    });
    [1.52, -1.52].forEach((x, i) => {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), capMat);
      cap.position.x = x;
      cap.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
      motorGroup.add(cap);
    });

    /* Shaft — inside a group so we can spin it cleanly */
    const shaftGroup = new THREE.Group();
    motorGroup.add(shaftGroup);
    const shaftMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.2 });
    const shaftMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.2, 16), shaftMat);
    shaftMesh.rotation.z = Math.PI / 2;
    shaftMesh.castShadow = true;
    shaftGroup.add(shaftMesh);

    /* Bearings — torus rings perpendicular to shaft (X) axis */
    const initBearingColor = STATUS_COLOR[statusRef.current] ?? STATUS_COLOR.NORMAL;
    const pc0 = PULSE_CFG[statusRef.current] ?? PULSE_CFG.NORMAL;
    const bearings = [-1.8, -0.6, 0.6, 1.8].map(x => {
      const mat = new THREE.MeshStandardMaterial({
        color: initBearingColor, emissive: initBearingColor,
        emissiveIntensity: pc0.min, metalness: 0.7, roughness: 0.3,
      });
      const torus = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 16, 32), mat);
      torus.position.x = x;
      torus.rotation.y = Math.PI / 2;   /* ring around X axis */
      torus.castShadow = true;
      motorGroup.add(torus);
      return torus;
    });

    /* Cooling fins — 8 fins running along motor length, at radius 1.28 */
    const finMat = new THREE.MeshStandardMaterial({
      color: dark ? '#1e293b' : '#475569', roughness: 0.8, metalness: 0.2,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 0.08), finMat);
      fin.position.set(0, Math.sin(angle) * 1.28, Math.cos(angle) * 1.28);
      fin.rotation.x = angle;
      fin.castShadow = true;
      motorGroup.add(fin);
    }

    /* Mounting base */
    const baseMat = new THREE.MeshStandardMaterial({
      color: dark ? '#1a2332' : '#94a3b8', roughness: 0.9, metalness: 0.1,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 2.0), baseMat);
    base.position.y = -1.3;
    base.receiveShadow = true;
    motorGroup.add(base);

    /* Bolts */
    const boltMat = new THREE.MeshStandardMaterial({ color: '#6b7280', metalness: 0.8, roughness: 0.3 });
    [[-1.4, -0.8], [-1.4, 0.8], [1.4, -0.8], [1.4, 0.8]].forEach(([x, z]) => {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), boltMat);
      bolt.position.set(x, -1.15, z);
      motorGroup.add(bolt);
    });

    /* Ground plane */
    const groundMat = new THREE.MeshStandardMaterial({
      color: dark ? '#0a0f1a' : '#cbd5e1',
      roughness: 1.0, metalness: 0, transparent: true, opacity: 0.8,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    ground.receiveShadow = true;
    scene.add(ground);

    /* Grid */
    const grid = new THREE.GridHelper(
      20, 20,
      dark ? '#1e3a5f' : '#cbd5e1',
      dark ? '#0f2040' : '#e2e8f0'
    );
    grid.position.y = -1.45;
    scene.add(grid);

    /* ── Drag / zoom controls ────────────────────────── */
    const canvas = renderer.domElement;
    let isDragging    = false;
    let prevMouse     = { x: 0, y: 0 };
    let lastDragTime  = 0;
    let lastPinchDist = 0;

    const onMouseDown = e => {
      isDragging = true;
      prevMouse  = { x: e.clientX, y: e.clientY };
      flashHint();
    };
    const onMouseMove = e => {
      if (!isDragging) return;
      motorGroup.rotation.y += (e.clientX - prevMouse.x) * 0.01;
      motorGroup.rotation.x += (e.clientY - prevMouse.y) * 0.01;
      prevMouse  = { x: e.clientX, y: e.clientY };
      lastDragTime = Date.now();
    };
    const onMouseUp    = () => { isDragging = false; lastDragTime = Date.now(); };
    const onMouseLeave = () => { isDragging = false; };

    const onTouchStart = e => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        flashHint();
      }
    };
    const onTouchMove = e => {
      if (e.touches.length === 2) {
        const dx   = e.touches[0].clientX - e.touches[1].clientX;
        const dy   = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0) {
          camera.position.multiplyScalar(1 + (lastPinchDist - dist) * 0.005);
        }
        lastPinchDist = dist;
        return;
      }
      if (!isDragging || e.touches.length !== 1) return;
      motorGroup.rotation.y += (e.touches[0].clientX - prevMouse.x) * 0.01;
      motorGroup.rotation.x += (e.touches[0].clientY - prevMouse.y) * 0.01;
      prevMouse    = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastDragTime = Date.now();
    };
    const onTouchEnd = () => { isDragging = false; lastDragTime = Date.now(); lastPinchDist = 0; };
    const onWheel    = e => { camera.position.multiplyScalar(1 + e.deltaY * 0.001); e.preventDefault(); };

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd);
    canvas.addEventListener('wheel',      onWheel,      { passive: false });

    /* ── Resize observer ─────────────────────────────── */
    const resizeObserver = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw > 0 && nh > 0) {
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
    });
    resizeObserver.observe(container);

    /* ── Store scene refs BEFORE animate() ──────────── */
    sceneRef.current = {
      scene, camera, renderer,
      bearings, shaftGroup, motorGroup,
      statusLight, accentLight, ambientLight, hemiLight,
      rotationSpeed: STATUS_SPEED[statusRef.current] ?? 1.0,
      pulseFreq:     pc0.freq,
      pulseMin:      pc0.min,
      pulseMax:      pc0.max,
      orbitEnabled:  true,
    };

    /* ── Animation loop ─────────────────────────────── */
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta   = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const r       = sceneRef.current;
      if (!r) return;

      /* Shaft spin */
      r.shaftGroup.rotation.x += (r.rotationSpeed ?? 1.0) * delta;

      /* Bearing pulse */
      const pulse = (Math.sin(elapsed * (r.pulseFreq ?? 1.0)) + 1) / 2;
      r.bearings?.forEach(b => {
        b.material.emissiveIntensity =
          (r.pulseMin ?? 0) + pulse * ((r.pulseMax ?? 0.3) - (r.pulseMin ?? 0));
      });

      /* Camera */
      const st           = statusRef.current;
      const timeSinceDrag = Date.now() - lastDragTime;
      const autoOrbit    = timeSinceDrag > 3000 && !isDragging;

      if (st === 'CRITICAL') {
        camera.position.x = 6 + Math.sin(elapsed * 15) * 0.05;
        camera.position.y = 4 + Math.cos(elapsed * 12) * 0.03;
        camera.lookAt(0, 0, 0);
      } else if (autoOrbit && r.orbitEnabled) {
        camera.position.x = 6 * Math.cos(elapsed * 0.15);
        camera.position.z = 8 * Math.sin(elapsed * 0.15);
        camera.lookAt(0, 0, 0);
      }

      /* Status light flicker on CRITICAL */
      if (st === 'CRITICAL' && r.statusLight) {
        r.statusLight.intensity = 2.5 + Math.random() * 1.5;
      }

      /* Gentle float */
      r.motorGroup.position.y = Math.sin(elapsed * 0.8) * 0.05;

      renderer.render(scene, camera);
    };

    setLoaded(true);
    animate();

    /* ── Cleanup ─────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('mousemove',  onMouseMove);
      canvas.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      canvas.removeEventListener('wheel',      onWheel);
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []); /* mount once */

  /* ── Status badge styles ──────────────────────────── */
  const stColor = status === 'CRITICAL' ? 'var(--color-status-critical)' : status === 'WARNING' ? 'var(--color-status-warning)' : 'var(--color-status-normal)';
  const stIcon  = status === 'CRITICAL' ? '🔴' : status === 'WARNING' ? '⚠' : '●';
  const v = sensorData;

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'block' }}
    >
      {/* Loading state */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: theme === 'dark' ? '#06080d' : '#f4f5f8',
          color: 'var(--color-ink-muted-48)', gap: 10, zIndex: 10,
        }}>
          <span style={{ fontSize: 36, animation: 'spin-gear 1.5s linear infinite', display: 'inline-block' }}>⚙</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Initializing 3D Engine…
          </span>
        </div>
      )}

      {/* HUD Scanner Overlay */}
      {loaded && (
        <div className="twin-hud-scanner">
          <div className="twin-hud-scanline" />
          <div className="twin-hud-corner twin-hud-corner-tl" />
          <div className="twin-hud-corner twin-hud-corner-tr" />
          <div className="twin-hud-corner twin-hud-corner-bl" />
          <div className="twin-hud-corner twin-hud-corner-br" />
        </div>
      )}

      {/* ① Status badge — top center */}
      {loaded && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 5, pointerEvents: 'none',
        }}>
          <div className={`twin-status-badge twin-status-${status.toLowerCase()}`}>
            {stIcon} {status}
          </div>
        </div>
      )}

      {/* ② Sensor mini panel — top left */}
      {loaded && callouts && (
        <div className="twin-sensor-panel">
          <div className="twin-sensor-row">
            <span className="twin-sensor-icon">⚡</span>
            <span className="twin-sensor-label">Vibration</span>
            <span className="twin-sensor-val" style={{ color: stColor }}>
              {v?.vibration?.toFixed(2) ?? '—'} mm/s
            </span>
          </div>
          <div className="twin-sensor-row">
            <span className="twin-sensor-icon">🌡</span>
            <span className="twin-sensor-label">Temp</span>
            <span className="twin-sensor-val">{v?.temperature?.toFixed(1) ?? '—'}°C</span>
          </div>
          <div className="twin-sensor-row">
            <span className="twin-sensor-icon">⏱</span>
            <span className="twin-sensor-label">RUL</span>
            <span className="twin-sensor-val">{v?.rul ?? '—'} days</span>
          </div>
        </div>
      )}

      {/* ⑤ HUD Controls — top right */}
      {loaded && (
        <div className="twin-hud-controls">
          <button
            className={`twin-hud-btn ${wireframe ? 'twin-hud-btn-active' : ''}`}
            onClick={() => setWireframe(w => !w)}
          >
            <span className="twin-hud-btn-icon">◇</span>
            Wireframe
          </button>
          <button
            className={`twin-hud-btn ${orbitEnabled ? 'twin-hud-btn-active' : ''}`}
            onClick={() => setOrbitEnabled(o => !o)}
          >
            <span className="twin-hud-btn-icon">↻</span>
            Orbit
          </button>
          <button
            className={`twin-hud-btn ${callouts ? 'twin-hud-btn-active' : ''}`}
            onClick={() => setCallouts(c => !c)}
          >
            <span className="twin-hud-btn-icon">◎</span>
            Callouts
          </button>
        </div>
      )}

      {/* ③ Controls hint — bottom center */}
      {loaded && (
        <div
          className="twin-controls-hint"
          style={{ opacity: showHint ? 1 : 0, transition: 'opacity 0.6s ease' }}
        >
          {isMobile ? '👆 Drag to rotate  •  Pinch to zoom' : '🖱 Drag to rotate  •  Scroll to zoom'}
        </div>
      )}

      {/* ④ Machine label — bottom left */}
      {loaded && (
        <div className="twin-machine-label">{machine}</div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DEFAULT EXPORT — wrapped in error boundary
══════════════════════════════════════════════════════════ */
export default function TwinView3D(props) {
  return (
    <TwinErrorBoundary>
      <TwinView3DInner {...props} />
    </TwinErrorBoundary>
  );
}
