import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Box, Play, Pause } from 'lucide-react';
import { mathEngine } from '../../engine/mathEngine';

interface Props {
  expr: string;
  varX?: string;
  varY?: string;
  dependentVar?: string;
  title?: string;
}

export const Graph3D = ({ expr, varX = 'x', varY = 'y', dependentVar = 'z', title }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const isMouseDownRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.offsetWidth || 400;
    const height = 280;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1c1c1e);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(12, 10, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 5. Build 3D Mesh Group
    const group = new THREE.Group();
    scene.add(group);
    meshGroupRef.current = group;

    // Grid Helper
    const grid = new THREE.GridHelper(10, 10, 0x007aff, 0x3a3a3c);
    grid.position.y = -2.5;
    group.add(grid);

    // Axes Helper
    const axes = new THREE.AxesHelper(6);
    group.add(axes);

    // Surface Mesh
    try {
      const { vertices, indices, colors } = mathEngine.generate3DSurfaceData(expr, 4, 32);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.3,
        metalness: 0.1,
        wireframe,
        side: THREE.DoubleSide
      });

      const surfaceMesh = new THREE.Mesh(geometry, material);
      group.add(surfaceMesh);
    } catch (err) {
      console.warn("Could not generate 3D surface mesh:", err);
    }

    // 6. Animation Loop
    const animate = () => {
      if (group && autoRotate && !isMouseDownRef.current) {
        group.rotation.y += 0.006;
      }
      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // 7. Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [expr]);

  // Update wireframe mode
  useEffect(() => {
    if (meshGroupRef.current) {
      meshGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          child.material.wireframe = wireframe;
        }
      });
    }
  }, [wireframe]);

  // Touch and Mouse Drag Rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDownRef.current = true;
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !meshGroupRef.current) return;
    const deltaX = e.clientX - mousePosRef.current.x;
    const deltaY = e.clientY - mousePosRef.current.y;

    meshGroupRef.current.rotation.y += deltaX * 0.01;
    meshGroupRef.current.rotation.x += deltaY * 0.01;

    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const handleReset = () => {
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.set(0, 0, 0);
    }
  };

  return (
    <div className="apple-graph-3d">
      <div className="graph-toolbar">
        <div className="graph-title-group">
          <span className="graph-badge badge-3d">3D Surface</span>
          <span className="graph-function-title">
            {title || `${dependentVar} = f(${varX}, ${varY})`}
          </span>
        </div>

        <div className="graph-actions">
          <button 
            className={`graph-btn ${wireframe ? 'active' : ''}`}
            onClick={() => setWireframe(!wireframe)}
            title="Toggle Wireframe Mesh"
          >
            <Box size={13} />
            <span>Wireframe</span>
          </button>

          <button 
            className={`graph-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle Auto Rotation"
          >
            {autoRotate ? <Pause size={13} /> : <Play size={13} />}
          </button>

          <button className="graph-btn" onClick={handleReset} title="Reset 3D View">
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div 
        ref={mountRef}
        className="canvas-3d-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: 'grab', width: '100%', height: '280px' }}
      />
    </div>
  );
};
