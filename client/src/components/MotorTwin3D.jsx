import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

function readVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const STATUS_COLORS = { NORMAL: 0x1d8a4a, WARNING: 0xb45309, CRITICAL: 0xc81e1e };
const STATUS_HEX    = { NORMAL: '#1d8a4a', WARNING: '#b45309', CRITICAL: '#c81e1e' };

export default function MotorTwin3D({ status = 'NORMAL', vibration = 0, theme = 'dark' }) {
  const mountRef   = useRef(null);
  const statusRef  = useRef(status);
  const sceneRef   = useRef(null);
  const ambientRef = useRef(null);
  const rimRef     = useRef(null);
  const [loaded,   setLoaded] = useState(false);

  useEffect(() => { statusRef.current = status; }, [status]);

  // Theme-driven background + lighting update (no remount needed)
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    const isDark = theme === 'dark';
    const bgVar = readVar('--color-canvas');
    const bgColor = bgVar ? new THREE.Color(bgVar).getHex() : (isDark ? 0x000000 : 0xf5f5f7);
    sc.background = new THREE.Color(bgColor);
    if (sc.fog) sc.fog = new THREE.FogExp2(bgColor, 0.038);
    if (ambientRef.current) ambientRef.current.intensity = isDark ? 5 : 10;
    if (rimRef.current)     rimRef.current.intensity     = isDark ? 1.8 : 0.8;
  }, [theme]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ──────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    /* ── Scene ─────────────────────────────────────── */
    const isDark  = theme === 'dark';
    const bgVar   = readVar('--color-canvas');
    const bgHex   = bgVar ? new THREE.Color(bgVar).getHex() : (isDark ? 0x000000 : 0xf5f5f7);
    const scene   = new THREE.Scene();
    scene.background = new THREE.Color(bgHex);
    scene.fog        = new THREE.FogExp2(bgHex, 0.038);
    sceneRef.current = scene;

    /* ── Camera ────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 100);

    /* ── Lights ────────────────────────────────────── */
    const ambient = new THREE.AmbientLight(0x0a1628, isDark ? 5 : 10);
    scene.add(ambient);
    ambientRef.current = ambient;

    const sunLight = new THREE.DirectionalLight(0xc8d8f0, isDark ? 3 : 4.5);
    sunLight.position.set(6, 10, 6); sunLight.castShadow = true; scene.add(sunLight);

    const primaryVar = readVar('--color-primary') || '#0066cc';
    const rimLight = new THREE.DirectionalLight(new THREE.Color(primaryVar).getHex(), isDark ? 1.8 : 0.8);
    rimLight.position.set(-6, 2, -5); scene.add(rimLight);
    rimRef.current = rimLight;

    scene.add(Object.assign(new THREE.DirectionalLight(0x1a2a3a, 2), { position: new THREE.Vector3(0, -4, 6) }));
    const criticalVar = readVar('--color-status-critical') || '#c81e1e';
    const critLight = new THREE.PointLight(new THREE.Color(criticalVar).getHex(), 0, 10);
    critLight.position.set(3, 4, 3); scene.add(critLight);

    /* ── Floor ─────────────────────────────────────── */
    scene.add(Object.assign(new THREE.GridHelper(24, 36, 0x162032, 0x111a27), { position: new THREE.Vector3(0, -2.6, 0) }));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: isDark ? 0x0b1220 : 0xd1e8ee, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -2.6; floor.receiveShadow = true; scene.add(floor);

    /* ── Motor group ────────────────────────────────── */
    const motorGroup = new THREE.Group(); scene.add(motorGroup);

    const platMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x1e293b : 0x475569, roughness: 0.9, metalness: 0.2 });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.8), platMat);
    plat.position.y = -1.65; plat.receiveShadow = true; plat.castShadow = true; motorGroup.add(plat);

    const boltMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.4, metalness: 0.8 });
    [[-1.4,-1.0],[1.4,-1.0],[-1.4,1.0],[1.4,1.0]].forEach(([x,z]) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.5,8), boltMat);
      b.position.set(x,-1.38,z); motorGroup.add(b);
    });

    const bodyMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x374151 : 0x475569, roughness: 0.7, metalness: 0.35 });
    const body    = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,2.8,48), bodyMat);
    body.castShadow = true; motorGroup.add(body);

    const capMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x4b5563 : 0x64748b, roughness: 0.55, metalness: 0.5 });
    [-1.4,1.4].forEach(y => { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,0.2,48), capMat); c.position.y = y; c.castShadow = true; motorGroup.add(c); });

    const termMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x4b5563 : 0x64748b, roughness: 0.7 });
    const term    = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.4,0.7), termMat);
    term.position.set(0,1.6,0); term.castShadow = true; motorGroup.add(term);

    const finMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x4b5563 : 0x64748b, roughness: 0.65, metalness: 0.25 });
    for (let i = 0; i < 6; i++) {
      const a = (i/6)*Math.PI*2;
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.1,2.5,0.8), finMat);
      f.position.set(Math.cos(a)*1.3,0,Math.sin(a)*1.3); f.rotation.y = -a; f.castShadow = true; motorGroup.add(f);
    }

    /* ── Shaft ─────────────────────────────────────── */
    const shaftGroup = new THREE.Group(); motorGroup.add(shaftGroup);
    const shaftMesh  = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,6.0,20),
      new THREE.MeshStandardMaterial({ color: 0xd4d8e0, roughness: 0.15, metalness: 0.95 }));
    shaftMesh.castShadow = true; shaftGroup.add(shaftMesh);
    const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07,5.8,0.07),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.3, metalness: 0.8 }));
    keyMesh.position.x = 0.14; shaftGroup.add(keyMesh);

    /* ── Bearings ──────────────────────────────────── */
    const bearingMats = [];
    [-1.6,-0.55,0.55,1.6].forEach(y => {
      const bMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x06b6d4), emissive: new THREE.Color(0x06b6d4), emissiveIntensity: 0.4, roughness: 0.25, metalness: 0.7 });
      bearingMats.push(bMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46,0.09,16,64), bMat);
      ring.rotation.x = Math.PI/2; ring.position.y = y; ring.castShadow = true; shaftGroup.add(ring);
    });

    /* ── Orbit controls ────────────────────────────── */
    let theta = 0.9, phi = 1.15, radius = 9.5, isDragging = false, lastX = 0, lastY = 0;
    const setCamera = (sx=0,sy=0) => { camera.position.set(radius*Math.sin(phi)*Math.sin(theta)+sx,radius*Math.cos(phi)+sy,radius*Math.sin(phi)*Math.cos(theta)); camera.lookAt(0,0,0); };
    const onDown  = e => { isDragging=true; lastX=e.clientX; lastY=e.clientY; };
    const onUp    = () => isDragging=false;
    const onMove  = e => { if(!isDragging)return; theta-=(e.clientX-lastX)*0.008; phi=Math.max(0.2,Math.min(Math.PI-0.2,phi+(e.clientY-lastY)*0.008)); lastX=e.clientX; lastY=e.clientY; };
    const onWheel = e => { radius=Math.max(4,Math.min(20,radius+e.deltaY*0.012)); };
    let tLastX=0,tLastY=0;
    const onTDown = e => { if(e.touches.length===1){isDragging=true;tLastX=e.touches[0].clientX;tLastY=e.touches[0].clientY;} };
    const onTMove = e => { if(!isDragging||e.touches.length!==1)return; theta-=(e.touches[0].clientX-tLastX)*0.008; phi=Math.max(0.2,Math.min(Math.PI-0.2,phi+(e.touches[0].clientY-tLastY)*0.008)); tLastX=e.touches[0].clientX;tLastY=e.touches[0].clientY; };

    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('wheel',      onWheel, { passive: true });
    renderer.domElement.addEventListener('touchstart', onTDown, { passive: true });
    renderer.domElement.addEventListener('touchmove',  onTMove, { passive: true });
    renderer.domElement.addEventListener('touchend',   onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);

    const ro = new ResizeObserver(() => { camera.aspect = mount.clientWidth/mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth,mount.clientHeight); });
    ro.observe(mount);

    /* ── Animation loop ────────────────────────────── */
    const clock = new THREE.Clock();
    const tCol  = new THREE.Color();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t  = clock.getElapsedTime();
      const st = statusRef.current;
      shaftGroup.rotation.y += st==='CRITICAL'?0.16:st==='WARNING'?0.07:0.022;
      tCol.setHex(STATUS_COLORS[st]??STATUS_COLORS.NORMAL);
      const pulse = (st==='CRITICAL'?0.6:st==='WARNING'?0.35:0.15)+(st==='CRITICAL'?0.8:st==='WARNING'?0.5:0.4)*0.5*(1+Math.sin(t*(st==='CRITICAL'?7:st==='WARNING'?4:1.8)));
      bearingMats.forEach(m => { m.color.lerp(tCol,0.12); m.emissive.lerp(tCol,0.12); m.emissiveIntensity=pulse; });
      rimLight.color.lerp(tCol,0.06);
      critLight.intensity = st==='CRITICAL'?3+Math.random()*3.5:0;
      let sx=0,sy=0;
      if(st==='CRITICAL'){sx=(Math.random()-0.5)*0.14;sy=(Math.random()-0.5)*0.14;}
      else if(st==='WARNING'){sx=(Math.random()-0.5)*0.035;sy=(Math.random()-0.5)*0.035;}
      setCamera(sx,sy);
      renderer.render(scene,camera);
    };

    setCamera();
    setLoaded(true);
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('wheel',     onWheel);
      renderer.domElement.removeEventListener('touchstart',onTDown);
      renderer.domElement.removeEventListener('touchmove', onTMove);
      renderer.domElement.removeEventListener('touchend',  onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => m.dispose());
        }
      });
      renderer.dispose();
      sceneRef.current  = null;
      ambientRef.current = null;
      rimRef.current    = null;
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []); // Only once — theme changes handled by separate effect above

  const hex = STATUS_HEX[status] ?? '#22c55e';
  return (
    <div className="twin3d-wrapper">
      {!loaded && <div className="twin3d-loading">⚙ Loading 3D Model…</div>}
      <div ref={mountRef} className="twin3d-canvas no-theme-transition" />
      <div className="twin3d-status-label" style={{ color: hex, textShadow: `0 0 24px ${hex}, 0 0 48px ${hex}55` }}>{status}</div>
      <div className="twin3d-vib-readout">
        <span style={{ color: 'var(--text-muted)' }}>VIB&nbsp;</span>
        <span style={{ color: hex }}>{typeof vibration==='number'?vibration.toFixed(3):'—'}</span>
        <span style={{ color: 'var(--text-muted)' }}>&nbsp;mm/s</span>
      </div>
      <div className="twin3d-hint">DRAG TO ROTATE · SCROLL TO ZOOM</div>
    </div>
  );
}
