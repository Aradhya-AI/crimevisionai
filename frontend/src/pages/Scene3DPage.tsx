import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Layers, RotateCcw, AlertTriangle, Eye, Shield } from 'lucide-react';
import { Case, EvidenceItem, AnalysisResult } from '../services/types';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';

interface Scene3DPageProps {
  activeCase: Case | null;
}

export const Scene3DPage: React.FC<Scene3DPageProps> = ({ activeCase }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [evidenceCount, setEvidenceCount] = useState<number>(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06090e);
    scene.fog = new THREE.FogExp2(0x06090e, 0.025);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Grid & Perimeter Layout
    const gridHelper = new THREE.GridHelper(30, 30, 0x00e5ff, 0x152033);
    scene.add(gridHelper);

    // Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x00e5ff, 2, 50);
    cyanPointLight.position.set(0, 12, 0);
    scene.add(cyanPointLight);

    // 3. 3D Forensic schematic markers representing detected evidence objects
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);

    // Subject Box 1 (Human profile silhouette)
    const personGeo = new THREE.BoxGeometry(2, 5, 2);
    const personMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const personMesh = new THREE.Mesh(personGeo, personMat);
    personMesh.position.set(-4, 2.5, 2);
    personMesh.userData = { id: 'OBJ-01', label: 'Person (Track TRK-01)', conf: '94%' };
    objectsGroup.add(personMesh);

    // Object Box 2 (Backpack candidate)
    const bagGeo = new THREE.BoxGeometry(1.2, 1.5, 1);
    const bagMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });
    const bagMesh = new THREE.Mesh(bagGeo, bagMat);
    bagMesh.position.set(-2.5, 1.5, 2.5);
    bagMesh.userData = { id: 'OBJ-02', label: 'Carried Item (Backpack)', conf: '88%' };
    objectsGroup.add(bagMesh);

    // Keypad/Entry Threshold marker
    const doorGeo = new THREE.BoxGeometry(4, 7, 0.5);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x2b3f61,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(6, 3.5, -4);
    doorMesh.userData = { id: 'OBJ-03', label: 'Security Keypad Threshold', conf: 'Physical Scene' };
    objectsGroup.add(doorMesh);

    // 4. Subtle rotation / Orbit animation
    let animationFrameId: number;
    let angle = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      angle += 0.003;
      camera.position.x = Math.sin(angle) * 25;
      camera.position.z = Math.cos(angle) * 25;
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* 3D Header */}
      <div className="glass-panel p-5 rounded-2xl border border-charcoal-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Box className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
              SPATIAL FORENSIC RECONSTRUCTION
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">3D Schematic Scene Viewer</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Three.js camera trajectory and relative bounding box coordinate layout.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge label="Three.js WebGL" size="sm" variant="cyan" />
          <Badge label="Schematic Mode" size="sm" variant="amber" />
        </div>
      </div>

      {/* Viewport Canvas & Scene Overlay */}
      <div className="glass-panel p-4 rounded-2xl border border-charcoal-700/60 relative overflow-hidden bg-charcoal-950">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2 px-1">
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>RENDER ENGINE: WEBGL THREE.JS V0.160+</span>
          </span>
          <span>PERSPECTIVE: ORBITAL ROTATION ACTIVE</span>
        </div>

        <div
          ref={mountRef}
          className="w-full h-[520px] rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing border border-charcoal-800"
        />

        {/* Forensic Caution Disclosure (Section 13 Compliance) */}
        <div className="mt-4 p-3.5 rounded-xl bg-charcoal-900 border border-amber-600/30 text-xs text-slate-300 flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 font-mono text-[11px] uppercase">
              STATUTORY SPATIAL DISCLAIMER:
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This interactive layout represents a <b>schematic topological visualization</b> mapped from
              2D detector bounding boxes and surveillance keyframe angles. It does <b>not</b> constitute a
              millimeter-calibrated LiDAR laser scan or certified photogrammetric crime scene reconstruction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
