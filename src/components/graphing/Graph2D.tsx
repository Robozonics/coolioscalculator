import { useState, useRef, useEffect } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Eye } from 'lucide-react';
import { mathEngine, type CriticalPoint } from '../../engine/mathEngine';

interface FunctionCurve {
  name: string;
  expr: string;
  color: string;
}

interface Props {
  functions: FunctionCurve[];
  title?: string;
  onClose?: () => void;
}

export const Graph2D = ({ functions, title }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport coordinates
  const [viewState, setViewState] = useState({
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10
  });

  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const [showCriticalPoints, setShowCriticalPoints] = useState(true);
  const [criticalPoints, setCriticalPoints] = useState<CriticalPoint[]>([]);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, view: viewState });

  // Recalculate critical points for primary function
  useEffect(() => {
    if (functions.length > 0) {
      const { criticalPoints: cp } = mathEngine.generateGraph2DData(
        functions[0].expr,
        viewState.xMin,
        viewState.xMax,
        (viewState.xMax - viewState.xMin) / 100
      );
      setCriticalPoints(cp);
    }
  }, [functions, viewState.xMin, viewState.xMax]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { xMin, xMax, yMin, yMax } = viewState;

    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Clear background
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#2c2c2e';

    const xStep = Math.pow(10, Math.floor(Math.log10(xMax - xMin))) / 2;
    const startX = Math.floor(xMin / xStep) * xStep;
    for (let x = startX; x <= xMax; x += xStep) {
      const sx = toScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();

      // Tick label
      if (Math.abs(x) > 1e-6) {
        ctx.fillStyle = '#8e8e93';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.fillText(x.toFixed(1), sx + 3, toScreenY(0) - 4);
      }
    }

    const yStep = Math.pow(10, Math.floor(Math.log10(yMax - yMin))) / 2;
    const startY = Math.floor(yMin / yStep) * yStep;
    for (let y = startY; y <= yMax; y += yStep) {
      const sy = toScreenY(y);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();

      if (Math.abs(y) > 1e-6) {
        ctx.fillStyle = '#8e8e93';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.fillText(y.toFixed(1), toScreenX(0) + 4, sy - 3);
      }
    }

    // Draw Primary Axes
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#636366';

    // X-Axis
    const originY = toScreenY(0);
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Y-Axis
    const originX = toScreenX(0);
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Plot curves
    functions.forEach(fn => {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = fn.color || '#007aff';
      ctx.beginPath();

      const numSamples = width;
      let isFirst = true;

      for (let px = 0; px <= numSamples; px++) {
        const x = xMin + (px / width) * (xMax - xMin);
        try {
          const { points } = mathEngine.generateGraph2DData(fn.expr, x, x, 0.1);
          if (points.length > 0) {
            const y = points[0].y;
            const sy = toScreenY(y);
            if (isFirst) {
              ctx.moveTo(px, sy);
              isFirst = false;
            } else {
              if (sy >= -100 && sy <= height + 100) {
                ctx.lineTo(px, sy);
              } else {
                isFirst = true;
              }
            }
          }
        } catch {
          isFirst = true;
        }
      }
      ctx.stroke();
    });

    // Plot Critical Points (Roots & Extrema)
    if (showCriticalPoints) {
      criticalPoints.forEach(cp => {
        const cx = toScreenX(cp.x);
        const cy = toScreenY(cp.y);

        if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fillStyle = cp.type === 'root' ? '#30d158' : cp.type === 'maximum' ? '#ff9f0a' : '#bf5af2';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    // Hover Inspection crosshair
    if (hoverCoord) {
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#007aff';

      ctx.beginPath();
      ctx.moveTo(hoverCoord.px, 0);
      ctx.lineTo(hoverCoord.px, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, hoverCoord.py);
      ctx.lineTo(width, hoverCoord.py);
      ctx.stroke();

      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(hoverCoord.px, hoverCoord.py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#007aff';
      ctx.fill();
    }
  }, [viewState, functions, hoverCoord, showCriticalPoints, criticalPoints]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const w = containerRef.current.offsetWidth;
        const h = 260;
        canvasRef.current.width = w;
        canvasRef.current.height = h;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse / Touch Interaction (Pan & Zoom)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      view: { ...viewState }
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const xVal = viewState.xMin + (px / canvas.width) * (viewState.xMax - viewState.xMin);
    const yVal = viewState.yMax - (py / canvas.height) * (viewState.yMax - viewState.yMin);

    setHoverCoord({ x: Number(xVal.toFixed(2)), y: Number(yVal.toFixed(2)), px, py });

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const xSpan = dragStartRef.current.view.xMax - dragStartRef.current.view.xMin;
      const ySpan = dragStartRef.current.view.yMax - dragStartRef.current.view.yMin;

      const deltaX = (dx / canvas.width) * xSpan;
      const deltaY = (dy / canvas.height) * ySpan;

      setViewState({
        xMin: dragStartRef.current.view.xMin - deltaX,
        xMax: dragStartRef.current.view.xMax - deltaX,
        yMin: dragStartRef.current.view.yMin + deltaY,
        yMax: dragStartRef.current.view.yMax + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 0.85 : 1.15;
    zoom(factor);
  };

  const zoom = (factor: number) => {
    setViewState(prev => {
      const xCenter = (prev.xMin + prev.xMax) / 2;
      const yCenter = (prev.yMin + prev.yMax) / 2;
      const halfX = ((prev.xMax - prev.xMin) * factor) / 2;
      const halfY = ((prev.yMax - prev.yMin) * factor) / 2;
      return {
        xMin: xCenter - halfX,
        xMax: xCenter + halfX,
        yMin: yCenter - halfY,
        yMax: yCenter + halfY
      };
    });
  };

  const recenter = () => {
    setViewState({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
  };

  return (
    <div className="apple-graph-2d" ref={containerRef}>
      {/* Graph Header */}
      <div className="graph-toolbar">
        <div className="graph-title-group">
          <span className="graph-badge">2D Plot</span>
          <span className="graph-function-title">{title || functions.map(f => f.expr).join(', ')}</span>
        </div>

        <div className="graph-actions">
          <button 
            className={`graph-btn ${showCriticalPoints ? 'active' : ''}`}
            onClick={() => setShowCriticalPoints(!showCriticalPoints)}
            title="Toggle Roots & Extrema"
          >
            <Eye size={13} />
            <span>Roots/Extrema</span>
          </button>
          
          <button className="graph-btn" onClick={() => zoom(0.8)} title="Zoom In">
            <ZoomIn size={13} />
          </button>

          <button className="graph-btn" onClick={() => zoom(1.25)} title="Zoom Out">
            <ZoomOut size={13} />
          </button>

          <button className="graph-btn" onClick={recenter} title="Recenter / Equalize Axes">
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { isDraggingRef.current = false; setHoverCoord(null); }}
          onWheel={handleWheel}
          style={{ width: '100%', height: '260px', display: 'block', cursor: 'crosshair' }}
        />

        {/* Hover Coordinate HUD */}
        {hoverCoord && (
          <div 
            className="hover-coord-badge"
            style={{
              left: Math.min(hoverCoord.px + 10, (canvasRef.current?.width || 300) - 90),
              top: Math.max(hoverCoord.py - 28, 10)
            }}
          >
            ({hoverCoord.x}, {hoverCoord.y})
          </div>
        )}
      </div>

      {/* Legend & Multi-graph details */}
      <div className="graph-footer-legend">
        {functions.map((f, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: f.color }}></span>
            <span className="legend-text">{f.name}: {f.expr}</span>
          </div>
        ))}

        {showCriticalPoints && criticalPoints.length > 0 && (
          <div className="critical-points-summary">
            {criticalPoints.slice(0, 3).map((cp, idx) => (
              <span key={idx} className={`cp-tag ${cp.type}`}>
                {cp.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
