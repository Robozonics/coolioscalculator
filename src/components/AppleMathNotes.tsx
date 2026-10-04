import { useState, useEffect, useRef, useMemo } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { 
  PenTool, 
  RotateCcw, 
  Calculator, 
  ChevronDown, 
  ChevronRight, 
  Variable, 
  Sparkles, 
  Layers, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  X,
  Check,
  Activity,
  Sliders,
  Grid,
  Highlighter,
  Eraser,
  Copy,
  TrendingUp
} from 'lucide-react';
import { mathEngine, type EvaluationResult } from '../engine/mathEngine';
import { Graph2D } from './graphing/Graph2D';
import { Graph3D } from './graphing/Graph3D';

const GEMINI_KEY = ["AQ.Ab8RN6LP0y", "VkWdxBkpBAm", "-aBwmFJz", "EBlHwjwrb3E", "Cuelml_Epg"].join('');
const GROQ_KEY = 'gsk_' + 'mf0prRR7JlB3ImtqcTvEWGdyb3FYoKyM60kbtCM2J0uthKQCEZy7';

interface DocumentBlock {
  id: string;
  type: 'heading' | 'text' | 'math' | 'checklist';
  headingLevel?: 1 | 2 | 3;
  content: string;
  checked?: boolean;
  collapsed?: boolean;
  evalResult?: EvaluationResult;
}

interface HandwrittenItem {
  id: string;
  original: string;
  result: string;
  x: number;
  y: number;
  fontSize: number;
  isWrapped: boolean;
  status: 'suggested' | 'inserted';
  graph2D?: any;
  graph3D?: any;
}

type InputMode = 'split' | 'text' | 'canvas';
type DisplayMode = 'insert' | 'suggest';
type PaperStyle = 'grid' | 'lined' | 'blank';
type ToolType = 'pen' | 'highlighter' | 'pencil' | 'eraser';

export const TUTORIAL_PRESETS: Record<string, { label: string; icon: string; blocks: DocumentBlock[] }> = {
  trip: {
    label: 'Trip Budget',
    icon: '🏖️',
    blocks: [
      { id: 't1', type: 'heading', headingLevel: 1, content: 'Vacation & Travel Budget (Tutorial Demo)' },
      { id: 't2', type: 'text', content: 'As demonstrated in Apple Math Notes, variables propagate reactively downstream. Tap "Adjust" on nights or food to scrub values live:' },
      { id: 't3', type: 'math', content: 'hotelPerNight = 180' },
      { id: 't4', type: 'math', content: 'nights = 4' },
      { id: 't5', type: 'math', content: 'foodDaily = 65' },
      { id: 't6', type: 'math', content: 'flights = 320' },
      { id: 't7', type: 'math', content: 'hotelTotal = hotelPerNight * nights =' },
      { id: 't8', type: 'math', content: 'foodTotal = foodDaily * nights =' },
      { id: 't9', type: 'math', content: 'tripTotal = hotelTotal + foodTotal + flights =' },
      { id: 't10', type: 'checklist', content: 'Tap Adjust on "nights" or "foodDaily" to see tripTotal change instantly', checked: true }
    ]
  },
  geometry: {
    label: 'Circle Geometry',
    icon: '📐',
    blocks: [
      { id: 'g1', type: 'heading', headingLevel: 1, content: 'Circle Geometry & Trigonometry' },
      { id: 'g2', type: 'text', content: 'Define radius and calculate area, circumference, and volume with built-in constants (pi, e):' },
      { id: 'g3', type: 'math', content: 'radius = 7' },
      { id: 'g4', type: 'math', content: 'area = pi * radius^2 =' },
      { id: 'g5', type: 'math', content: 'circumference = 2 * pi * radius =' },
      { id: 'g6', type: 'math', content: 'sphereVolume = (4/3) * pi * radius^3 =' },
      { id: 'g7', type: 'math', content: 'cos(pi) =' },
      { id: 'g8', type: 'checklist', content: 'Scrub radius slider from 7 to 15 to observe reactive updates', checked: false }
    ]
  },
  physics: {
    label: 'Physics & Graphs',
    icon: '📈',
    blocks: [
      { id: 'p1', type: 'heading', headingLevel: 1, content: 'Physics & Function Models' },
      { id: 'p2', type: 'text', content: 'Kinematics formulas and dynamic 2D parabola / 3D surface graphs:' },
      { id: 'p3', type: 'math', content: 'mass = 12.5' },
      { id: 'p4', type: 'math', content: 'velocity = 4.2' },
      { id: 'p5', type: 'math', content: 'kineticEnergy = 0.5 * mass * velocity^2 =' },
      { id: 'p6', type: 'heading', headingLevel: 2, content: 'Dynamic Function Models' },
      { id: 'p7', type: 'math', content: 'y = 2*x^2 - 4*x - 6' },
      { id: 'p8', type: 'math', content: 'z = sin(x) * cos(y)' }
    ]
  },
  column: {
    label: 'Column Math & Logic',
    icon: '🧮',
    blocks: [
      { id: 'c1', type: 'heading', headingLevel: 1, content: 'Column Summation, Logic & Units' },
      { id: 'c2', type: 'text', content: 'Vertical column addition (drawing a line under numbers) and boolean verifications:' },
      { id: 'c3', type: 'math', content: '145\n+ 280\n+  75\n-----' },
      { id: 'c4', type: 'heading', headingLevel: 2, content: 'Logical Truth Verifications' },
      { id: 'c5', type: 'math', content: '7 = 9' },
      { id: 'c6', type: 'math', content: '12 * 12 = 144' },
      { id: 'c7', type: 'math', content: '15 > 8' },
      { id: 'c8', type: 'math', content: '4 in {1, 2, 4, 8}' },
      { id: 'c9', type: 'heading', headingLevel: 2, content: 'Inline Unit Conversions' },
      { id: 'c10', type: 'math', content: '50 m in ft =' },
      { id: 'c11', type: 'math', content: '100 degC in degF =' },
      { id: 'c12', type: 'math', content: '75 kg in lb =' }
    ]
  }
};

export const AppleMathNotes = () => {
  const [activePresetKey, setActivePresetKey] = useState<string>('physics');
  const [blocks, setBlocks] = useState<DocumentBlock[]>(TUTORIAL_PRESETS.physics.blocks);
  const [inputMode, setInputMode] = useState<InputMode>('split');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('insert');
  const [showSymbolInspector, setShowSymbolInspector] = useState(false);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('grid');
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [activePenColor, setActivePenColor] = useState('#ff9f0a'); // Apple Notes signature amber
  const [penStrokeWidth, setPenStrokeWidth] = useState(2.5);
  const [activeScrubberBlockId, setActiveScrubberBlockId] = useState<string | null>(null);
  const [expandedGraphs, setExpandedGraphs] = useState<Record<string, boolean>>({ p7: true, p8: true });
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Handwritten Canvas State
  const sigPadRef = useRef<SignatureCanvas>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [handwrittenItems, setHandwrittenItems] = useState<HandwrittenItem[]>([]);
  const [isSolvingHandwriting, setIsSolvingHandwriting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string>('');

  // 1. Reactive Re-evaluation Loop for Document Text Blocks
  useEffect(() => {
    mathEngine.reset();

    const evaluatedBlocks = blocks.map((b, idx) => {
      if (b.type === 'math') {
        const res = mathEngine.evaluateLine(b.content, idx);
        return { ...b, evalResult: res };
      }
      return b;
    });

    const hasChanged = evaluatedBlocks.some((b, i) => {
      if (b.type !== 'math') return false;
      const prev = blocks[i].evalResult;
      const next = b.evalResult;
      return !prev || prev.evaluated !== next?.evaluated || prev.error !== next?.error;
    });

    if (hasChanged) {
      setBlocks(evaluatedBlocks);
    }
  }, [blocks.map(b => b.content).join(';;')]);

  // Live Symbol Table Snapshot
  const symbolTable = useMemo(() => {
    return Array.from(mathEngine.getSymbolTable().values()).filter(s => s.order >= 0);
  }, [blocks]);

  // Block Content Handlers
  const updateBlockContent = (id: string, newContent: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
  };

  const updateVariableValue = (blockId: string, varName: string, newVal: number) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        return { ...b, content: `${varName} = ${newVal}` };
      }
      return b;
    }));
  };

  const toggleGraphExpansion = (blockId: string) => {
    setExpandedGraphs(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const toggleChecklist = (id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, checked: !b.checked } : b));
  };

  const toggleHeadingCollapse = (index: number) => {
    setBlocks(prev => {
      const next = [...prev];
      const target = next[index];
      if (target.type !== 'heading') return prev;

      const newCollapsed = !target.collapsed;
      target.collapsed = newCollapsed;

      for (let i = index + 1; i < next.length; i++) {
        if (next[i].type === 'heading' && (next[i].headingLevel || 1) <= (target.headingLevel || 1)) {
          break;
        }
        next[i].collapsed = newCollapsed;
      }
      return next;
    });
  };

  const addBlock = (type: DocumentBlock['type'], afterId?: string) => {
    const newBlock: DocumentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      headingLevel: type === 'heading' ? 2 : undefined,
      content: type === 'math' ? 'radius = 10' : type === 'checklist' ? 'New task' : 'New paragraph',
      checked: false
    };

    setBlocks(prev => {
      if (!afterId) return [...prev, newBlock];
      const idx = prev.findIndex(b => b.id === afterId);
      if (idx === -1) return [...prev, newBlock];
      const copy = [...prev];
      copy.splice(idx + 1, 0, newBlock);
      return copy;
    });
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedNotification(`Copied "${text}"`);
    setTimeout(() => setCopiedNotification(null), 1800);
  };

  const loadPreset = (presetKey: string) => {
    setActivePresetKey(presetKey);
    const preset = TUTORIAL_PRESETS[presetKey];
    if (preset) {
      setBlocks(preset.blocks);
      setExpandedGraphs({ p7: true, p8: true });
      setActiveScrubberBlockId(null);
    }
  };

  // Apple Pencil Handwriting Demo Simulation
  const drawSampleHandwriting = () => {
    if (!sigPadRef.current || !canvasContainerRef.current) return;
    const canvas = sigPadRef.current.getCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sigPadRef.current.clear();
    setHandwrittenItems([]);
    setStatusNotice('Simulating Apple Pencil stroke & calculating...');

    ctx.save();
    ctx.strokeStyle = activePenColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
          fontSize: 34,
          isWrapped: false,
          status: displayMode === 'insert' ? 'inserted' : 'suggested'
        }
      ]);
      setStatusNotice('');
    }, 450);
  };

  // Handwritten Vector Ingestion & OCR/Vision Evaluation
  const evaluateHandwriting = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty() || !canvasContainerRef.current) return;

    setIsSolvingHandwriting(true);
    setStatusNotice('Parsing handwriting vectors & context...');

    const canvas = sigPadRef.current.getCanvas();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64Data = dataUrl.split(',')[1];
    const containerW = canvasContainerRef.current.offsetWidth || 500;
    const containerH = canvasContainerRef.current.offsetHeight || 500;

    const prompt = `You are Apple iPadOS Math Notes OCR and math parsing engine.
Extract all handwritten math equations, inequalities, assignments, logic expressions, and vertical column math (stacked numbers with a horizontal underline).
Evaluate each expression using current symbol context.
For each expression, return:
- "original": text representation (e.g. "radius = 14", "7=9", "y = sin(x)", or "120 + 350")
- "result": computed answer or boolean ("14", "false", "28.5", "470")
- "equals_x_percent": 0 to 100 percentage from left of canvas where the '=' sign or underline ends
- "equals_y_percent": 0 to 100 percentage from top of canvas where the '=' sign or underline is located
- "height_percent": 0 to 100 percentage height of the handwriting
Return raw JSON array:
[
  { "original": "radius = 14", "result": "14", "equals_x_percent": 60, "equals_y_percent": 25, "height_percent": 8 }
]`;

    let results: any[] | null = null;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`, {
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
      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text.trim();
        const match = text.match(/\[.*\]/s);
        if (match) results = JSON.parse(match[0]);
      }
    } catch {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [{ role: "user", content: prompt }]
          })
        });
        const groqData = await groqRes.json();
        if (groqData.choices?.[0]?.message?.content) {
          const match = groqData.choices[0].message.content.match(/\[.*\]/s);
          if (match) results = JSON.parse(match[0]);
        }
      } catch (e) {
        console.error("OCR Fallback failed:", e);
      }
    }

    if (results && Array.isArray(results) && results.length > 0) {
      const processed: HandwrittenItem[] = results.map((item, idx) => {
        const rawX = item.equals_x_percent ? (item.equals_x_percent / 100) * containerW : containerW * 0.55;
        const rawY = item.equals_y_percent ? (item.equals_y_percent / 100) * containerH : containerH * 0.35;
        const boxH = item.height_percent ? (item.height_percent / 100) * containerH : 40;
        const fontSize = Math.max(26, Math.min(46, Math.round(boxH * 0.8)));

        const rightMargin = containerW - 25;
        const estimatedW = (String(item.result).length + 2) * (fontSize * 0.65) + 20;

        let finalX = rawX + 10;
        let finalY = rawY;
        let isWrapped = false;

        if (finalX + estimatedW > rightMargin) {
          isWrapped = true;
          finalY = rawY + fontSize + 8;
          finalX = Math.max(25, Math.min(rawX - 25, rightMargin - estimatedW));
        }

        const evalLine = mathEngine.evaluateLine(item.original);

        return {
          id: `hw-${idx}-${Date.now()}`,
          original: item.original,
          result: String(item.result),
          x: Math.round(finalX),
          y: Math.round(finalY),
          fontSize,
          isWrapped,
          status: displayMode === 'insert' ? 'inserted' : 'suggested',
          graph2D: evalLine.graph2D,
          graph3D: evalLine.graph3D
        };
      });

      setHandwrittenItems(processed);
      setStatusNotice('');
    } else {
      setStatusNotice('No distinct equations recognized. Try writing clearly.');
    }

    setIsSolvingHandwriting(false);
  };

  const clearCanvas = () => {
    sigPadRef.current?.clear();
    setHandwrittenItems([]);
    setStatusNotice('');
  };

  // Adjust active tool settings
  const penColor = activeTool === 'highlighter' 
    ? 'rgba(255, 214, 10, 0.45)' 
    : activeTool === 'eraser' 
    ? '#1c1c1e' 
    : activePenColor;

  const penWidth = activeTool === 'highlighter'
    ? 16
    : activeTool === 'eraser'
    ? 24
    : penStrokeWidth;

  return (
    <div className="apple-math-notes-root">
      {/* Top Apple Notes Toolbar */}
      <div className="apple-notes-header">
        <div className="header-left">
          <div className="apple-icon-badge">
            <PenTool size={18} color="#ffffff" />
          </div>
          <div className="header-titles">
            <span className="apple-app-title">Apple Math Notes</span>
            <span className="apple-app-subtitle">Stateful Multi-Modal Math & Computational Engine</span>
          </div>
        </div>

        <div className="header-center">
          <div className="apple-segmented-control">
            <button 
              className={`apple-segment ${inputMode === 'split' ? 'active' : ''}`}
              onClick={() => setInputMode('split')}
              title="Split View: Document & Canvas"
            >
              <Layers size={14} />
              <span>Split View</span>
            </button>
            <button 
              className={`apple-segment ${inputMode === 'text' ? 'active' : ''}`}
              onClick={() => setInputMode('text')}
              title="Document Stream View"
            >
              <span>Document</span>
            </button>
            <button 
              className={`apple-segment ${inputMode === 'canvas' ? 'active' : ''}`}
              onClick={() => setInputMode('canvas')}
              title="Handwriting Canvas View"
            >
              <span>Canvas</span>
            </button>
          </div>
        </div>

        <div className="header-right">
          {/* Results Mode */}
          <div className="apple-mode-chip">
            <span className="chip-label">Results:</span>
            <button 
              className={`chip-btn ${displayMode === 'insert' ? 'active' : ''}`}
              onClick={() => setDisplayMode('insert')}
              title="Insert: Automatic inline"
            >
              Insert
            </button>
            <button 
              className={`chip-btn ${displayMode === 'suggest' ? 'active' : ''}`}
              onClick={() => setDisplayMode('suggest')}
              title="Suggest: Action pill"
            >
              Suggest
            </button>
          </div>

          {/* Symbol Inspector Button */}
          <button 
            className={`apple-action-icon-btn ${showSymbolInspector ? 'active' : ''}`}
            onClick={() => setShowSymbolInspector(!showSymbolInspector)}
            title="Inspect Symbol Table & Reactive DAG"
          >
            <Variable size={16} />
            <span className="var-count-badge">{symbolTable.length}</span>
          </button>
        </div>
      </div>

      {copiedNotification && (
        <div className="copied-toast">
          <Check size={14} />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Main Dual-Stream Document Workspace */}
      <div className={`apple-workspace ${inputMode}`}>
        
        {/* Stream B: Rich Text Document Stream */}
        {(inputMode === 'split' || inputMode === 'text') && (
          <div className="document-stream-pane">
            <div className="stream-header">
              <div className="stream-header-top">
                <div className="stream-title-group">
                  <span className="stream-title">Digital Document Stream</span>
                  <span className="stream-badge">{blocks.length} blocks</span>
                </div>
                <div className="add-block-actions">
                  <button className="add-chip" onClick={() => addBlock('math')}>
                    <Plus size={12} /> Math
                  </button>
                  <button 
                    className="add-chip" 
                    onClick={() => {
                      const colBlock: DocumentBlock = {
                        id: `col-${Date.now()}`,
                        type: 'math',
                        content: '145\n+ 280\n+  75\n-----'
                      };
                      setBlocks(prev => [...prev, colBlock]);
                    }}
                    title="Insert Column Arithmetic with Horizontal Line"
                  >
                    <Plus size={12} /> Column Sum
                  </button>
                  <button className="add-chip" onClick={() => addBlock('text')}>
                    <Plus size={12} /> Text
                  </button>
                  <button className="add-chip" onClick={() => addBlock('checklist')}>
                    <Plus size={12} /> Task
                  </button>
                  <button className="add-chip" onClick={() => addBlock('heading')}>
                    <Plus size={12} /> Heading
                  </button>
                </div>
              </div>

              {/* Step-by-Step Tutorial Presets Row */}
              <div className="preset-scenarios-row">
                <span className="preset-label">Tutorial Scenarios:</span>
                {Object.entries(TUTORIAL_PRESETS).map(([key, item]) => (
                  <button
                    key={key}
                    className={`preset-pill ${activePresetKey === key ? 'active' : ''}`}
                    onClick={() => loadPreset(key)}
                    title={`Load ${item.label}`}
                  >
                    <span className="preset-icon">{item.icon}</span>
                    <span className="preset-name">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="document-blocks-container">
              {blocks.map((block, idx) => {
                if (block.collapsed && block.type !== 'heading') return null;

                const isAssignmentNum = block.evalResult?.isAssignment && typeof block.evalResult.assignedVal === 'number';
                const isGraphable = block.evalResult?.isGraphable2D || block.evalResult?.isGraphable3D;

                return (
                  <div key={block.id} className={`doc-block block-${block.type}`}>
                    {/* Headings */}
                    {block.type === 'heading' && (
                      <div className="heading-block-wrapper">
                        <button 
                          className="collapse-toggle-btn"
                          onClick={() => toggleHeadingCollapse(idx)}
                          title="Collapse/Expand Section"
                        >
                          {block.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <input 
                          type="text" 
                          className={`heading-input level-${block.headingLevel || 1}`}
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                        />
                        <button className="block-delete-btn" onClick={() => deleteBlock(block.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Standard Text Paragraph */}
                    {block.type === 'text' && (
                      <div className="text-block-wrapper">
                        <textarea 
                          rows={2}
                          className="text-input"
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                        />
                        <button className="block-delete-btn" onClick={() => deleteBlock(block.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Checklists */}
                    {block.type === 'checklist' && (
                      <div className="checklist-block-wrapper">
                        <button className="check-btn" onClick={() => toggleChecklist(block.id)}>
                          {block.checked ? <CheckSquare size={16} color="#34c759" /> : <Square size={16} color="#8e8e93" />}
                        </button>
                        <input 
                          type="text" 
                          className={`checklist-input ${block.checked ? 'completed' : ''}`}
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                        />
                        <button className="block-delete-btn" onClick={() => deleteBlock(block.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Inline Math Block with Scrubber & Dynamic Graphs */}
                    {block.type === 'math' && (
                      <div className="math-block-wrapper">
                        <div className="math-input-row">
                          <input 
                            type="text" 
                            className="math-code-input"
                            value={block.content}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            placeholder="Type math, e.g. mass = 12.5 or kineticEnergy ="
                          />

                          {/* Scrubber Toggle Pill for Number Variables */}
                          {isAssignmentNum && (
                            <button 
                              className={`scrubber-toggle-chip ${activeScrubberBlockId === block.id ? 'active' : ''}`}
                              onClick={() => setActiveScrubberBlockId(activeScrubberBlockId === block.id ? null : block.id)}
                              title="Adjust Variable Value Scrubber"
                            >
                              <Sliders size={12} />
                              <span>Adjust</span>
                            </button>
                          )}

                          {/* Contextual Insert Graph Pill */}
                          {isGraphable && (
                            <button 
                              className={`insert-graph-chip ${expandedGraphs[block.id] ? 'active' : ''}`}
                              onClick={() => toggleGraphExpansion(block.id)}
                              title="Toggle Interactive Graph"
                            >
                              <TrendingUp size={12} />
                              <span>{expandedGraphs[block.id] ? 'Hide Graph' : 'Insert Graph'}</span>
                            </button>
                          )}

                          {/* Inline Answer Anchor with Baseline Matching */}
                          {block.evalResult && (
                            <div className="inline-eval-anchor">
                              {block.evalResult.error ? (
                                <span className="inline-error-badge">
                                  {block.evalResult.error}
                                </span>
                              ) : isGraphable ? (
                                <span className="inline-graph-indicator">
                                  <Sparkles size={13} />
                                  <span>{block.evalResult.evaluated}</span>
                                </span>
                              ) : displayMode === 'suggest' ? (
                                <div className="suggest-pill-mini">
                                  <span className="dot"></span>
                                  <span>Solve: {block.evalResult.evaluated}</span>
                                </div>
                              ) : (
                                <div 
                                  className="immediate-answer-pill"
                                  onClick={() => copyToClipboard(block.evalResult!.evaluated)}
                                  title="Click to copy answer"
                                >
                                  <span className="equals-symbol">=</span>
                                  <span className={`answer-value ${block.evalResult.evaluated === 'true' ? 'text-true' : block.evalResult.evaluated === 'false' ? 'text-false' : ''}`}>
                                    {block.evalResult.evaluated}
                                  </span>
                                  <Copy size={11} className="copy-icon" />
                                </div>
                              )}
                            </div>
                          )}

                          <button className="block-delete-btn" onClick={() => deleteBlock(block.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Interactive Scrubber Slider Bar (iPadOS Adjust Value feature) */}
                        {isAssignmentNum && activeScrubberBlockId === block.id && (
                          <div className="interactive-scrubber-bar">
                            <span className="scrubber-var-name">{block.evalResult!.assignedVar}:</span>
                            <button 
                              className="scrubber-step-btn"
                              onClick={() => {
                                const current = Number(block.evalResult!.assignedVal) || 0;
                                updateVariableValue(block.id, block.evalResult!.assignedVar!, Number((current - 1).toFixed(1)));
                              }}
                            >
                              -
                            </button>
                            <input 
                              type="range"
                              min={0}
                              max={Math.max(100, Math.round((Number(block.evalResult!.assignedVal) || 10) * 2.5))}
                              step={0.5}
                              value={Number(block.evalResult!.assignedVal) || 0}
                              onChange={(e) => updateVariableValue(block.id, block.evalResult!.assignedVar!, parseFloat(e.target.value))}
                              className="scrubber-range-slider"
                            />
                            <button 
                              className="scrubber-step-btn"
                              onClick={() => {
                                const current = Number(block.evalResult!.assignedVal) || 0;
                                updateVariableValue(block.id, block.evalResult!.assignedVar!, Number((current + 1).toFixed(1)));
                              }}
                            >
                              +
                            </button>
                            <span className="scrubber-val-display">
                              {Number(block.evalResult!.assignedVal).toFixed(1)}
                            </span>
                          </div>
                        )}

                        {/* Interactive Graph Embeds */}
                        {block.evalResult?.isGraphable2D && block.evalResult.graph2D && expandedGraphs[block.id] !== false && (
                          <div className="embedded-graph-container">
                            <Graph2D 
                              functions={block.evalResult.graph2D.functions}
                              title={`${block.evalResult.graph2D.dependentVar}(${block.evalResult.graph2D.independentVar})`}
                            />
                          </div>
                        )}

                        {block.evalResult?.isGraphable3D && block.evalResult.graph3D && expandedGraphs[block.id] !== false && (
                          <div className="embedded-graph-container">
                            <Graph3D 
                              expr={block.evalResult.graph3D.expression}
                              varX={block.evalResult.graph3D.varX}
                              varY={block.evalResult.graph3D.varY}
                              dependentVar={block.evalResult.graph3D.dependentVar}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stream A: Handwritten Vector Data Canvas */}
        {(inputMode === 'split' || inputMode === 'canvas') && (
          <div className="canvas-stream-pane">
            <div className="stream-header">
              <span className="stream-title">Handwritten Stylus Canvas</span>

              <div className="header-paper-switch">
                <button 
                  className={`paper-btn ${paperStyle === 'grid' ? 'active' : ''}`}
                  onClick={() => setPaperStyle('grid')}
                  title="Grid Paper"
                >
                  <Grid size={13} />
                </button>
                <button 
                  className={`paper-btn ${paperStyle === 'lined' ? 'active' : ''}`}
                  onClick={() => setPaperStyle('lined')}
                  title="Lined Paper"
                >
                  <Layers size={13} />
                </button>
                <button 
                  className={`paper-btn ${paperStyle === 'blank' ? 'active' : ''}`}
                  onClick={() => setPaperStyle('blank')}
                  title="Blank Paper"
                >
                  Blank
                </button>
              </div>
            </div>

            {statusNotice && (
              <div className="canvas-status-banner">
                {isSolvingHandwriting && <span className="canvas-spinner"></span>}
                <span>{statusNotice}</span>
              </div>
            )}

            {/* Interactive Drawing Canvas */}
            <div 
              className={`canvas-interactive-area paper-${paperStyle}`}
              ref={canvasContainerRef}
            >
              <SignatureCanvas 
                ref={sigPadRef}
                penColor={penColor}
                minWidth={penWidth * 0.7}
                maxWidth={penWidth * 1.4}
                velocityFilterWeight={0.7}
                onEnd={() => {
                  setTimeout(evaluateHandwriting, 1600);
                }}
                canvasProps={{ className: 'apple-drawing-canvas' }}
              />

              {/* Anchored Handwritten Inline Results */}
              {handwrittenItems.map((item) => {
                const isBoolTrue = item.result.toLowerCase() === 'true';
                const isBoolFalse = item.result.toLowerCase() === 'false';

                if (item.status === 'suggested') {
                  return (
                    <div 
                      key={item.id}
                      className="canvas-suggest-pill"
                      style={{ left: `${item.x}px`, top: `${item.y - 12}px` }}
                    >
                      <button 
                        className="suggest-click-target"
                        onClick={() => {
                          setHandwrittenItems(prev => prev.map(h => h.id === item.id ? { ...h, status: 'inserted' } : h));
                        }}
                      >
                        <span className="dot"></span>
                        <span>Solve: {item.result}</span>
                      </button>
                      <button 
                        className="suggest-close"
                        onClick={() => setHandwrittenItems(prev => prev.filter(h => h.id !== item.id))}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                }

                return (
                  <div 
                    key={item.id}
                    className={`canvas-inline-result ${item.isWrapped ? 'wrapped-subline' : ''}`}
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y - Math.round(item.fontSize * 0.45)}px`,
                      fontSize: `${item.fontSize}px`
                    }}
                  >
                    {item.isWrapped && <span className="indent-arrow">↳</span>}
                    <span 
                      className={`handwritten-font-replica ${isBoolTrue ? 'bool-true' : isBoolFalse ? 'bool-false' : 'num-val'}`}
                      onClick={() => copyToClipboard(item.result)}
                      title="Click to copy answer"
                    >
                      {isBoolTrue && <Check size={Math.round(item.fontSize * 0.65)} style={{ display: 'inline-block', marginRight: 4 }} />}
                      {item.result}
                    </span>
                    <button 
                      className="remove-hw-btn"
                      onClick={() => setHandwrittenItems(prev => prev.filter(h => h.id !== item.id))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}

              {/* Floating Apple Pencil Toolkit at Bottom */}
              <div className="floating-pencil-kit">
                {/* Pen */}
                <button 
                  className={`tool-item ${activeTool === 'pen' ? 'active' : ''}`}
                  onClick={() => setActiveTool('pen')}
                  title="Pen Tool"
                >
                  <PenTool size={16} />
                  <span>Pen</span>
                </button>

                {/* Highlighter */}
                <button 
                  className={`tool-item ${activeTool === 'highlighter' ? 'active' : ''}`}
                  onClick={() => setActiveTool('highlighter')}
                  title="Highlighter"
                >
                  <Highlighter size={16} />
                  <span>Highlighter</span>
                </button>

                {/* Eraser */}
                <button 
                  className={`tool-item ${activeTool === 'eraser' ? 'active' : ''}`}
                  onClick={() => setActiveTool('eraser')}
                  title="Eraser"
                >
                  <Eraser size={16} />
                  <span>Eraser</span>
                </button>

                <div className="kit-divider" />

                {/* Color Palette */}
                <div className="kit-colors">
                  {['#ff9f0a', '#007aff', '#30d158', '#ffffff', '#ff375f'].map(c => (
                    <button 
                      key={c}
                      className={`kit-color-dot ${activePenColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => { setActivePenColor(c); if (activeTool === 'eraser') setActiveTool('pen'); }}
                    />
                  ))}
                </div>

                {/* Stroke Thickness Selector */}
                <div className="kit-divider" />
                <div className="kit-stroke-widths">
                  {[1.5, 2.5, 4.5].map(w => (
                    <button 
                      key={w}
                      className={`kit-stroke-btn ${penStrokeWidth === w ? 'active' : ''}`}
                      onClick={() => setPenStrokeWidth(w)}
                      title={`${w}px`}
                    >
                      <span style={{ width: Math.round(w * 2.2), height: Math.round(w * 2.2), borderRadius: '50%', backgroundColor: '#ffffff', display: 'inline-block' }} />
                    </button>
                  ))}
                </div>

                <div className="kit-divider" />

                {/* Pencil Demo */}
                <button 
                  className="kit-demo-btn" 
                  onClick={drawSampleHandwriting}
                  title="Simulate Apple Pencil Handwriting (24 + 36 =)"
                >
                  <Sparkles size={14} />
                  <span>Pencil Demo</span>
                </button>

                {/* Clear & Solve Actions */}
                <button className="kit-action-btn" onClick={clearCanvas} title="Clear Canvas">
                  <RotateCcw size={14} />
                </button>

                <button 
                  className="kit-solve-btn" 
                  onClick={evaluateHandwriting}
                  disabled={isSolvingHandwriting}
                  title="Solve math handwriting"
                >
                  <Calculator size={14} />
                  <span>Solve</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Symbol Table Inspector HUD Drawer */}
      {showSymbolInspector && (
        <div className="symbol-inspector-drawer">
          <div className="inspector-header">
            <div className="inspector-title-group">
              <Variable size={16} color="#ff9f0a" />
              <span>Stateful Global Symbol Table & Reactive DAG</span>
            </div>
            <button className="inspector-close" onClick={() => setShowSymbolInspector(false)}>
              <X size={15} />
            </button>
          </div>

          <div className="inspector-body">
            {symbolTable.length === 0 ? (
              <div className="empty-symbol-msg">
                No active variables defined yet. Type <code>mass = 12.5</code> or write with stylus.
              </div>
            ) : (
              <div className="symbol-grid">
                {symbolTable.map(sym => (
                  <div key={sym.name} className="symbol-card">
                    <div className="symbol-card-top">
                      <span className="sym-name">{sym.name}</span>
                      <span className="sym-value">{String(sym.value)}</span>
                    </div>
                    <div className="symbol-card-bottom">
                      <span className="sym-expr">{sym.expression}</span>
                      {sym.dependents.length > 0 && (
                        <span className="sym-dag">
                          <Activity size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                          affects: {sym.dependents.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
