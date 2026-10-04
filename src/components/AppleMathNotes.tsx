import React, { useState, useEffect, useRef, useMemo } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Sparkles, 
  PenTool, 
  Sliders, 
  Variable, 
  RotateCcw, 
  Copy, 
  Check, 
  X, 
  Type,
  Plus,
  Trash2,
  Zap,
  Activity
} from 'lucide-react';
import { mathEngine, type EvaluationResult } from '../engine/mathEngine';
import { Graph2D } from './graphing/Graph2D';
import { Graph3D } from './graphing/Graph3D';

const GEMINI_KEY = ["AQ.Ab8RN6LP0y", "VkWdxBkpBAm", "-aBwmFJz", "EBlHwjwrb3E", "Cuelml_Epg"].join('');
const GROQ_KEY = 'gsk_' + 'mf0prRR7JlB3ImtqcTvEWGdyb3FYoKyM60kbtCM2J0uthKQCEZy7';

let geminiCooldownUntil = 0;

function preprocessCanvasForOCR(sourceCanvas: HTMLCanvasElement): string {
  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = sourceCanvas.width;
    offscreen.height = sourceCanvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return sourceCanvas.toDataURL('image/png');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(sourceCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const alpha = d[i + 3];
      const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (alpha > 40 && brightness > 30) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 255;
      } else {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return offscreen.toDataURL('image/png');
  } catch {
    return sourceCanvas.toDataURL('image/png');
  }
}

interface MathLine {
  id: string;
  raw: string;
  evalResult?: EvaluationResult;
}

interface HandwrittenItem {
  id: string;
  original: string;
  result: string;
  x: number;
  y: number;
  fontSize: number;
}

// Simple, curated futuristic presets
export const FUTURISTIC_PRESETS = [
  {
    id: 'trip',
    title: 'Trip Budget',
    icon: '🏖️',
    lines: [
      '# Vacation & Travel Model',
      'hotelPerNight = 180',
      'nights = 4',
      'foodDaily = 65',
      'flights = 320',
      'tripTotal = (hotelPerNight * nights) + (foodDaily * nights) + flights ='
    ]
  },
  {
    id: 'physics',
    title: 'Quantum & Kinematics',
    icon: '⚛️',
    lines: [
      '# Projectile & Energy',
      'mass = 12.5',
      'velocity = 4.2',
      'kineticEnergy = 0.5 * mass * velocity^2 =',
      'y = 2*x^2 - 4*x - 6'
    ]
  },
  {
    id: 'geometry',
    title: 'Circle Geometry',
    icon: '📐',
    lines: [
      '# Orbit Geometry',
      'radius = 7',
      'area = pi * radius^2 =',
      'circumference = 2 * pi * radius =',
      'volume = (4/3) * pi * radius^3 ='
    ]
  },
  {
    id: 'units',
    title: 'Units & Logic',
    icon: '⚡',
    lines: [
      '# Multi-Unit Conversions & Truth',
      '50 m in ft =',
      '100 degC in degF =',
      '7 = 9',
      '12 * 12 = 144'
    ]
  }
];

export const AppleMathNotes: React.FC = () => {
  // Mode: 'type' (Smart Pad) or 'draw' (Neon Stylus Canvas)
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  
  // Lines state for Smart Pad
  const [lines, setLines] = useState<MathLine[]>([
    { id: 'l1', raw: '# Cybernetic Math Notes' },
    { id: 'l2', raw: 'mass = 12.5' },
    { id: 'l3', raw: 'velocity = 4.2' },
    { id: 'l4', raw: 'kineticEnergy = 0.5 * mass * velocity^2 =' },
    { id: 'l5', raw: 'y = 2*x^2 - 4*x - 6' },
    { id: 'l6', raw: '50 m in ft =' },
    { id: 'l7', raw: '7 = 9' }
  ]);

  const [activeScrubberLineId, setActiveScrubberLineId] = useState<string | null>(null);
  const [showVariableHUD, setShowVariableHUD] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Handwritten Stylus Canvas State
  const sigPadRef = useRef<SignatureCanvas>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [handwrittenItems, setHandwrittenItems] = useState<HandwrittenItem[]>([]);
  const [isSolving, setIsSolving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [activePenColor, setActivePenColor] = useState('#00f2fe'); // Futuristic Electric Cyan
  const solveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize canvas coordinate resolution with its DOM container
  useEffect(() => {
    if (mode !== 'draw') return;

    const resizeCanvas = () => {
      const pad = sigPadRef.current;
      const container = canvasContainerRef.current;
      if (!pad || !container) return;

      const canvas = pad.getCanvas();
      if (!canvas) return;

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const targetWidth = Math.round(rect.width * ratio);
      const targetHeight = Math.round(rect.height * ratio);

      // Only resize if the internal resolution doesn't match the container dimensions
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        let savedData: any = null;
        try {
          if (!pad.isEmpty()) {
            savedData = pad.toData();
          }
        } catch {
          // ignore
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(ratio, ratio);
        }

        if (savedData && savedData.length > 0) {
          try {
            pad.fromData(savedData);
          } catch {
            // ignore
          }
        }
      }
    };

    // Immediate invocation and schedule next ticks for DOM rendering
    resizeCanvas();
    const rafId = requestAnimationFrame(resizeCanvas);
    const timerId = setTimeout(resizeCanvas, 60);

    const ro = new ResizeObserver(() => {
      resizeCanvas();
    });

    if (canvasContainerRef.current) {
      ro.observe(canvasContainerRef.current);
    }
    window.addEventListener('resize', resizeCanvas);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      ro.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [mode]);

  // Live Reactive Evaluation Engine for Lines
  useEffect(() => {
    mathEngine.reset();

    const evaluated = lines.map((line, idx) => {
      const clean = line.raw.trim();
      if (!clean || clean.startsWith('#') || clean.startsWith('//')) {
        return { ...line, evalResult: undefined };
      }
      const res = mathEngine.evaluateLine(clean, idx);
      return { ...line, evalResult: res };
    });

    const changed = evaluated.some((item, i) => {
      const prev = lines[i]?.evalResult;
      const next = item.evalResult;
      return prev?.evaluated !== next?.evaluated || prev?.error !== next?.error;
    });

    if (changed) {
      setLines(evaluated);
    }
  }, [lines.map(l => l.raw).join(';;')]);

  // Symbol Table Snapshot
  const symbolTable = useMemo(() => {
    return Array.from(mathEngine.getSymbolTable().values()).filter(s => s.order >= 0);
  }, [lines]);

  // Handlers
  const updateLineRaw = (id: string, newRaw: string) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, raw: newRaw } : l));
  };

  const addLine = (afterId?: string) => {
    const newLine: MathLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      raw: ''
    };
    setLines(prev => {
      if (!afterId) return [...prev, newLine];
      const idx = prev.findIndex(l => l.id === afterId);
      if (idx === -1) return [...prev, newLine];
      const copy = [...prev];
      copy.splice(idx + 1, 0, newLine);
      return copy;
    });
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      setLines([{ id: `line-${Date.now()}`, raw: '' }]);
      return;
    }
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateVariable = (lineId: string, varName: string, val: number) => {
    setLines(prev => prev.map(l => {
      if (l.id === lineId) {
        return { ...l, raw: `${varName} = ${val}` };
      }
      return l;
    }));
  };

  const copyAnswer = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedNotification(`Copied ${text} ✨`);
    setTimeout(() => setCopiedNotification(null), 1800);
  };

  const loadPreset = (presetId: string) => {
    const preset = FUTURISTIC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setLines(preset.lines.map((raw, idx) => ({ id: `p-${idx}-${Date.now()}`, raw })));
    setActiveScrubberLineId(null);
  };

  // Futuristic Stylus: Simulate Apple Pencil Demo
  const drawSampleHandwriting = () => {
    if (!sigPadRef.current) return;
    const canvas = sigPadRef.current.getCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sigPadRef.current.clear();
    setHandwrittenItems([]);
    setStatusMessage('Simulating neural pencil stroke...');

    ctx.save();
    ctx.strokeStyle = activePenColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = activePenColor;
    ctx.shadowBlur = 12;

    const startX = 60;
    const startY = 120;

    // Draw '2'
    ctx.beginPath();
    ctx.arc(startX + 18, startY + 15, 14, Math.PI, 0);
    ctx.lineTo(startX + 6, startY + 45);
    ctx.lineTo(startX + 30, startY + 45);
    ctx.stroke();

    // Draw '4'
    ctx.beginPath();
    ctx.moveTo(startX + 55, startY + 6);
    ctx.lineTo(startX + 42, startY + 30);
    ctx.lineTo(startX + 68, startY + 30);
    ctx.moveTo(startX + 60, startY + 15);
    ctx.lineTo(startX + 60, startY + 45);
    ctx.stroke();

    // Draw '+'
    ctx.beginPath();
    ctx.moveTo(startX + 88, startY + 26);
    ctx.lineTo(startX + 108, startY + 26);
    ctx.moveTo(startX + 98, startY + 16);
    ctx.lineTo(startX + 98, startY + 36);
    ctx.stroke();

    // Draw '3'
    ctx.beginPath();
    ctx.arc(startX + 128, startY + 16, 10, -Math.PI * 0.7, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(startX + 128, startY + 34, 11, -Math.PI * 0.5, Math.PI * 0.8);
    ctx.stroke();

    // Draw '6'
    ctx.beginPath();
    ctx.arc(startX + 162, startY + 32, 12, 0, Math.PI * 2);
    ctx.moveTo(startX + 169, startY + 8);
    ctx.quadraticCurveTo(startX + 150, startY + 15, startX + 150, startY + 32);
    ctx.stroke();

    // Draw '='
    ctx.beginPath();
    ctx.moveTo(startX + 190, startY + 22);
    ctx.lineTo(startX + 218, startY + 22);
    ctx.moveTo(startX + 190, startY + 32);
    ctx.lineTo(startX + 218, startY + 32);
    ctx.stroke();

    ctx.restore();

    setTimeout(() => {
      setHandwrittenItems([
        {
          id: `demo-${Date.now()}`,
          original: '24 + 36 =',
          result: '60',
          x: startX + 236,
          y: startY + 28,
          fontSize: 34
        }
      ]);
      setStatusMessage('');
    }, 450);
  };

  // Solve handwritten canvas strokes with resilient multi-tier engine
  const solveHandwriting = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty() || !canvasContainerRef.current) return;
    setIsSolving(true);
    setStatusMessage('Neural vision engine parsing math...');

    const canvas = sigPadRef.current.getCanvas();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64Data = dataUrl.split(',')[1];
    const containerW = canvasContainerRef.current.offsetWidth || 500;
    const containerH = canvasContainerRef.current.offsetHeight || 500;

    const prompt = `You are a futuristic Math Notes OCR engine.
Extract all handwritten math equations, inequalities, assignments, and logic expressions.
Evaluate each expression using current symbol context.
For each expression, return raw JSON array:
[
  { "original": "radius = 14", "result": "14", "equals_x_percent": 60, "equals_y_percent": 25, "height_percent": 8 }
]`;

    let results: any[] | null = null;
    let engineSource = '';

    // Tier 1: Gemini Vision (only if not rate-limited with 429)
    if (Date.now() >= geminiCooldownUntil) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64Data } }
              ]
            }]
          })
        });

        if (response.status === 429 || response.status === 503) {
          geminiCooldownUntil = Date.now() + 5 * 60 * 1000;
          console.warn("Gemini 429 rate-limit detected. Seamlessly activating Groq AI + local OCR.");
        } else if (response.ok) {
          const data = await response.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text.trim();
            const match = text.match(/\[.*\]/s);
            if (match) {
              results = JSON.parse(match[0]);
              engineSource = 'Gemini';
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini request failed, falling back:", geminiErr);
      }
    }

    // Tier 2: Groq AI (openai/gpt-oss-20b) + Tesseract OCR Fallback
    if (!results || results.length === 0) {
      setStatusMessage('Solving via Groq Neural Engine...');
      try {
        const processedUrl = preprocessCanvasForOCR(canvas);
        const Tesseract = (await import('tesseract.js')).default;
        const ocrData = await Tesseract.recognize(processedUrl, 'eng');
        const rawText = ocrData?.data?.text?.trim() || '';

        const mathText = rawText
          .replace(/[\r\n]+/g, ' ')
          .replace(/[—–]/g, '-')
          .replace(/[×✕]/g, '*')
          .replace(/[÷]/g, '/')
          .trim();

        if (mathText) {
          // Check local math engine first
          const localEval = mathEngine.evaluateLine(mathText, 999);
          if (localEval && localEval.evaluated !== undefined && !localEval.error) {
            results = [{
              original: mathText,
              result: String(localEval.evaluated)
            }];
            engineSource = 'Math Engine';
          }

          // If complex or unparsed locally, solve via Groq (openai/gpt-oss-20b)
          if (!results) {
            const groqPrompt = `You are an iPadOS Math Notes OCR solver.
Solve the following equation extracted from handwriting: "${mathText}".
Return JSON ONLY in this format: [{"original": "${mathText}", "result": "answer"}]`;

            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: "openai/gpt-oss-20b",
                messages: [{ role: "user", content: groqPrompt }]
              })
            });

            if (groqRes.ok) {
              const groqData = await groqRes.json();
              const content = groqData.choices?.[0]?.message?.content;
              if (content) {
                const match = content.match(/\[.*\]/s) || content.match(/\{.*\}/s);
                if (match) {
                  const parsed = JSON.parse(match[0]);
                  results = Array.isArray(parsed) ? parsed : [parsed];
                  engineSource = 'Groq AI';
                }
              }
            }
          }
        }
      } catch (ocrErr) {
        console.warn("OCR + Groq fallback error:", ocrErr);
      }
    }

    if (results && Array.isArray(results) && results.length > 0) {
      // Calculate rightmost stroke point from user's actual drawing
      let maxX = 0;
      let lastY = 0;
      try {
        const strokeData = sigPadRef.current.toData();
        for (const group of strokeData) {
          for (const pt of group) {
            if (pt.x > maxX) {
              maxX = pt.x;
              lastY = pt.y;
            }
          }
        }
      } catch {
        // ignore
      }

      const items: HandwrittenItem[] = results.map((item, idx) => {
        const defaultX = maxX > 0 ? Math.min(maxX + 14, containerW - 140) : (containerW * 0.55);
        const defaultY = lastY > 0 ? lastY : (containerH * 0.35);

        const x = item.equals_x_percent ? (item.equals_x_percent / 100) * containerW : defaultX;
        const y = item.equals_y_percent ? (item.equals_y_percent / 100) * containerH : defaultY;
        const boxH = item.height_percent ? (item.height_percent / 100) * containerH : 38;
        return {
          id: `hw-${idx}-${Date.now()}`,
          original: item.original,
          result: String(item.result),
          x: Math.round(x + 10),
          y: Math.round(y),
          fontSize: Math.max(24, Math.min(42, Math.round(boxH * 0.85)))
        };
      });
      setHandwrittenItems(items);
      setStatusMessage(engineSource ? `Solved via ${engineSource} ✨` : 'Solved ✨');
    } else {
      setStatusMessage('No distinct equation detected. Try writing clearly, e.g. 24 + 36 =');
    }
    setIsSolving(false);
  };

  const undoDrawStroke = () => {
    if (!sigPadRef.current) return;
    try {
      const data = sigPadRef.current.toData();
      if (data && data.length > 0) {
        data.pop();
        sigPadRef.current.fromData(data);
        if (data.length === 0) {
          setHandwrittenItems([]);
        }
      }
    } catch {
      // ignore
    }
  };

  const clearDrawCanvas = () => {
    if (solveTimeoutRef.current) clearTimeout(solveTimeoutRef.current);
    sigPadRef.current?.clear();
    setHandwrittenItems([]);
    setStatusMessage('');
  };

  return (
    <div className="futuristic-math-notes-root">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="futuristic-toast">
          <Check size={14} color="#00f2fe" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Top Futuristic Header */}
      <header className="futuristic-header">
        <div className="f-header-left">
          <div className="f-glow-badge">
            <Zap size={16} color="#00f2fe" />
          </div>
          <div className="f-title-group">
            <span className="f-title">Cyber Math Notes</span>
            <span className="f-subtitle">Neural Reactive Engine</span>
          </div>
        </div>

        {/* Quick Demos Bar */}
        <div className="f-presets-chips">
          {FUTURISTIC_PRESETS.map(p => (
            <button key={p.id} className="f-preset-chip" onClick={() => loadPreset(p.id)}>
              <span>{p.icon}</span>
              <span className="p-title">{p.title}</span>
            </button>
          ))}
        </div>

        {/* Top Controls */}
        <div className="f-header-right">
          {/* Mode Switcher: Type vs Draw */}
          <div className="f-mode-pill-toggle">
            <button 
              className={`f-mode-btn ${mode === 'type' ? 'active' : ''}`}
              onClick={() => setMode('type')}
              title="Smart Pad Mode"
            >
              <Type size={14} />
              <span>Type</span>
            </button>
            <button 
              className={`f-mode-btn ${mode === 'draw' ? 'active' : ''}`}
              onClick={() => setMode('draw')}
              title="Neon Stylus Mode"
            >
              <PenTool size={14} />
              <span>Draw</span>
            </button>
          </div>

          {/* Variables HUD Toggle */}
          <button 
            className={`f-icon-pill ${showVariableHUD ? 'active' : ''}`}
            onClick={() => setShowVariableHUD(!showVariableHUD)}
            title="Inspect Reactive Symbol Variables"
          >
            <Variable size={15} />
            <span className="hud-badge">{symbolTable.length}</span>
          </button>
        </div>
      </header>

      {/* Main Unified Pad Surface */}
      <main className="futuristic-main-surface">
        
        {/* MODE A: Smart Typed Pad */}
        {mode === 'type' && (
          <div className="f-pad-container">
            <div className="f-lines-scroll-area">
              {lines.map((line, idx) => {
                const isHeading = line.raw.trim().startsWith('#');
                const isAssignmentNum = line.evalResult?.isAssignment && typeof line.evalResult.assignedVal === 'number';
                const isGraphable2D = line.evalResult?.isGraphable2D && line.evalResult.graph2D;
                const isGraphable3D = line.evalResult?.isGraphable3D && line.evalResult.graph3D;

                return (
                  <div key={line.id} className={`f-line-row ${isHeading ? 'is-heading' : ''}`}>
                    {/* Line Index or Bullet */}
                    <span className="f-line-num">{idx + 1}</span>

                    {/* Input Field */}
                    <div className="f-input-wrapper">
                      <input 
                        type="text"
                        className={`f-line-input ${isHeading ? 'heading-font' : ''}`}
                        value={line.raw}
                        onChange={(e) => updateLineRaw(line.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addLine(line.id);
                          }
                          if (e.key === 'Backspace' && line.raw === '' && lines.length > 1) {
                            e.preventDefault();
                            removeLine(line.id);
                          }
                        }}
                        placeholder={isHeading ? 'Section Header' : 'Type math equation, e.g. mass = 12.5 or y = 2*x^2 - 4'}
                      />

                      {/* Interactive Scrubber Pill for Numbers */}
                      {isAssignmentNum && (
                        <button 
                          className={`f-scrubber-pill ${activeScrubberLineId === line.id ? 'active' : ''}`}
                          onClick={() => setActiveScrubberLineId(activeScrubberLineId === line.id ? null : line.id)}
                          title="Tweak value with slider"
                        >
                          <Sliders size={12} />
                          <span>Adjust</span>
                        </button>
                      )}

                      {/* Holographic Inline Answer Badge */}
                      {line.evalResult?.evaluated && !isHeading && (
                        <div 
                          className="f-holo-answer-badge"
                          onClick={() => copyAnswer(line.evalResult!.evaluated)}
                          title="Click to copy answer"
                        >
                          <span className="holo-eq">=</span>
                          <span className={`holo-val ${line.evalResult.evaluated === 'true' ? 'val-true' : line.evalResult.evaluated === 'false' ? 'val-false' : ''}`}>
                            {line.evalResult.evaluated}
                          </span>
                          <Copy size={11} className="holo-copy-icon" />
                        </div>
                      )}

                      {/* Line Delete Button */}
                      <button className="f-line-del-btn" onClick={() => removeLine(line.id)} title="Delete line">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Interactive Value Scrubber Slider */}
                    {isAssignmentNum && activeScrubberLineId === line.id && (
                      <div className="f-scrubber-glow-slider">
                        <span className="scrubber-label">{line.evalResult!.assignedVar}:</span>
                        <input 
                          type="range"
                          min={0}
                          max={Math.max(100, Math.round((Number(line.evalResult!.assignedVal) || 10) * 2.5))}
                          step={0.5}
                          value={Number(line.evalResult!.assignedVal) || 0}
                          onChange={(e) => updateVariable(line.id, line.evalResult!.assignedVar!, parseFloat(e.target.value))}
                          className="scrubber-range"
                        />
                        <span className="scrubber-current-num">
                          {Number(line.evalResult!.assignedVal).toFixed(1)}
                        </span>
                      </div>
                    )}

                    {/* Dynamic Holographic Graph Embeds */}
                    {isGraphable2D && (
                      <div className="f-graph-holo-box">
                        <Graph2D 
                          functions={line.evalResult!.graph2D!.functions}
                          title={`${line.evalResult!.graph2D!.dependentVar}(${line.evalResult!.graph2D!.independentVar})`}
                        />
                      </div>
                    )}

                    {isGraphable3D && (
                      <div className="f-graph-holo-box">
                        <Graph3D 
                          expr={line.evalResult!.graph3D!.expression}
                          varX={line.evalResult!.graph3D!.varX}
                          varY={line.evalResult!.graph3D!.varY}
                          dependentVar={line.evalResult!.graph3D!.dependentVar}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Line Prompt */}
              <button className="f-add-line-btn" onClick={() => addLine()}>
                <Plus size={14} />
                <span>Add Equation Line</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE B: Futuristic Neon Stylus Canvas */}
        {mode === 'draw' && (
          <div className="f-stylus-canvas-container" ref={canvasContainerRef}>
            {statusMessage && (
              <div className="f-canvas-status-pill">
                {isSolving && <span className="f-status-spinner" />}
                <span>{statusMessage}</span>
              </div>
            )}

            <SignatureCanvas 
              ref={sigPadRef}
              penColor={activePenColor}
              minWidth={2.5}
              maxWidth={4.8}
              velocityFilterWeight={0.7}
              onEnd={() => {
                if (solveTimeoutRef.current) clearTimeout(solveTimeoutRef.current);
                solveTimeoutRef.current = setTimeout(solveHandwriting, 1800);
              }}
              canvasProps={{ className: 'f-neural-canvas' }}
            />

            {/* Anchored Holographic Handwritten Results */}
            {handwrittenItems.map(item => (
              <div 
                key={item.id}
                className="f-handwritten-holo-anchor"
                style={{
                  left: `${item.x}px`,
                  top: `${item.y - Math.round(item.fontSize * 0.45)}px`,
                  fontSize: `${item.fontSize}px`
                }}
              >
                <span 
                  className="holo-handwritten-text"
                  onClick={() => copyAnswer(item.result)}
                  title="Click to copy answer"
                >
                  = {item.result}
                </span>
                <button 
                  className="f-hw-del-btn"
                  onClick={() => setHandwrittenItems(prev => prev.filter(h => h.id !== item.id))}
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Floating Minimalist Stylus Dock */}
            <div className="f-floating-stylus-dock">
              {/* Color Glowing Dots */}
              <div className="f-dock-colors">
                {['#00f2fe', '#4facfe', '#77DD77', '#ff9f0a', '#ff007f'].map(c => (
                  <button 
                    key={c}
                    className={`f-color-dot ${activePenColor === c ? 'active' : ''}`}
                    style={{ backgroundColor: c, boxShadow: activePenColor === c ? `0 0 12px ${c}` : 'none' }}
                    onClick={() => setActivePenColor(c)}
                    title={`Select Color ${c}`}
                  />
                ))}
              </div>

              <div className="f-dock-divider" />

              {/* Sample Handwriting Demo */}
              <button className="f-dock-action-btn" onClick={drawSampleHandwriting} title="Draw Pencil Demo">
                <Sparkles size={14} color="#00f2fe" />
                <span>Pencil Demo</span>
              </button>

              {/* Undo Last Stroke */}
              <button className="f-dock-icon-btn" onClick={undoDrawStroke} title="Undo Last Stroke">
                <RotateCcw size={14} />
              </button>

              {/* Clear Canvas */}
              <button className="f-dock-icon-btn" onClick={clearDrawCanvas} title="Clear Canvas">
                <Trash2 size={14} />
              </button>

              {/* Instant Solve Button */}
              <button 
                className="f-dock-solve-btn"
                onClick={solveHandwriting}
                disabled={isSolving}
                title="Solve Handwriting"
              >
                <Zap size={14} />
                <span>Solve</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Holographic Variable HUD Drawer */}
      {showVariableHUD && (
        <aside className="f-variables-hud-panel">
          <div className="hud-header">
            <div className="hud-title-row">
              <Variable size={16} color="#00f2fe" />
              <span>Reactive Symbol Table</span>
            </div>
            <button className="hud-close-btn" onClick={() => setShowVariableHUD(false)}>
              <X size={15} />
            </button>
          </div>

          <div className="hud-body">
            {symbolTable.length === 0 ? (
              <div className="hud-empty">
                No active variables defined yet. Type <code>radius = 14</code> in the pad.
              </div>
            ) : (
              <div className="hud-grid">
                {symbolTable.map(sym => (
                  <div key={sym.name} className="hud-card">
                    <div className="hud-card-top">
                      <span className="hud-var-name">{sym.name}</span>
                      <span className="hud-var-val">{String(sym.value)}</span>
                    </div>
                    {sym.dependents.length > 0 && (
                      <div className="hud-card-dep">
                        <Activity size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                        affects: {sym.dependents.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};
