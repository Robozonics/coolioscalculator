import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, Calculator, X, LineChart as ChartIcon, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as math from 'mathjs';

const GEMINI_KEY = ["AQ.Ab8RN6LP0y", "VkWdxBkpBAm", "-aBwmFJz", "EBlHwjwrb3E", "Cuelml_Epg"].join('');
const GROQ_KEY = 'gsk_' + 'mf0prRR7JlB3ImtqcTvEWGdyb3FYoKyM60kbtCM2J0uthKQCEZy7';

interface MathResultItem {
  id: string;
  original: string;
  result: string;
  graph?: string;
  x: number;
  y: number;
  fontSize: number;
  isWrapped: boolean;
  status: 'suggested' | 'inserted';
}

type DisplayMode = 'insert' | 'suggest';

const MathNotes = () => {
  const sigPad = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [inlineResults, setInlineResults] = useState<MathResultItem[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('insert');
  const [graphData, setGraphData] = useState<any[] | null>(null);
  const [activeGraphExpr, setActiveGraphExpr] = useState<string>('');
  const [enableGraphing, setEnableGraphing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resizeCanvas = () => {
      if (sigPad.current && containerRef.current) {
        const canvas = sigPad.current.getCanvas();
        const wrapper = containerRef.current;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = wrapper.offsetWidth * ratio;
        canvas.height = wrapper.offsetHeight * ratio;
        canvas.style.width = wrapper.offsetWidth + 'px';
        canvas.style.height = wrapper.offsetHeight + 'px';
        canvas.getContext('2d')?.scale(ratio, ratio);
      }
    };
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const clearCanvas = () => {
    sigPad.current?.clear();
    setInlineResults([]);
    setGraphData(null);
    setActiveGraphExpr('');
    setStatusMessage('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current as number);
  };

  const handleDrawEnd = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current as number);
    timeoutRef.current = setTimeout(() => {
      recognizeMath();
    }, 1800);
  };

  const getStrokeMetrics = () => {
    if (!sigPad.current) return null;
    const data = (sigPad.current as any).toData();
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    data.forEach((stroke: any) => {
      if (stroke.points && Array.isArray(stroke.points)) {
        stroke.points.forEach((pt: any) => {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        });
      }
    });

    if (minX === Infinity) return null;

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerY: (minY + maxY) / 2
    };
  };

  const isExplicit2DFunction = (expr?: string, original?: string): boolean => {
    if (!expr) return false;
    const orig = (original || '').toLowerCase().trim();
    if (orig.startsWith('plot') || orig.startsWith('graph')) return true;
    const isExplicitFunctionPattern = /^(y|f\(x\))\s*=/i.test(orig);
    const containsX = /\bx\b/i.test(expr);
    const isNotConstant = !/^[0-9\s.+\-*/=]+$/.test(expr);
    return isExplicitFunctionPattern && containsX && isNotConstant;
  };

  const recognizeMath = async () => {
    if (!sigPad.current || sigPad.current.isEmpty() || !containerRef.current) return;

    setRecognizing(true);
    setStatusMessage('Analyzing handwriting...');

    const canvas = sigPad.current.getCanvas();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64Data = dataUrl.split(',')[1];

    const containerWidth = containerRef.current.offsetWidth || 600;
    const containerHeight = containerRef.current.offsetHeight || 500;
    const strokeMetrics = getStrokeMetrics();

    const prompt = `Analyze this handwritten math canvas.
1. Extract every mathematical equation, arithmetic operation, logical comparison, inequality, or set membership statement.
2. Evaluate each expression:
   - For logical comparisons & inequalities (e.g. "7=9", "5>3", "4<=2", "x in {1,2,3}"), evaluate them strictly to "true" or "false".
   - For arithmetic (e.g. "12*5", "100/4"), compute the exact numeric answer.
   - For algebraic systems (e.g. "x=5", then "x+3="), evaluate sequentially using previous variables.
3. Coordinates for Inline Baseline Alignment:
   - For each equation, detect where the equals sign '=' (or end of expression) is located.
   - "equals_x_percent": 0 to 100 percentage from left of canvas where '=' ends.
   - "equals_y_percent": 0 to 100 percentage from top of canvas where '=' center baseline is.
   - "approx_height_percent": 0 to 100 percentage of the height of the handwritten expression.
4. GRAPH RESTRICTION:
   - Do NOT include any "graph" field unless the user explicitly drew a 2D function of x (like "y = x^2" or "f(x) = sin(x)") or wrote "plot" or "graph".
   - NEVER add a graph field for arithmetic, logic (like 7=9), single numbers, or simple assignments.
5. Return ONLY a raw JSON array:
[
  {
    "original": "7=9",
    "result": "false",
    "equals_x_percent": 65,
    "equals_y_percent": 30,
    "approx_height_percent": 10
  }
]`;

    let rawResults: any[] | null = null;

    // Primary: Gemini 3.5 Flash
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
      if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text.trim();
        const match = text.match(/\[.*\]/s);
        if (match) {
          rawResults = JSON.parse(match[0]);
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini 3.5 flash attempt failed:", geminiErr);
    }

    // Secondary: Gemini 3 Flash Preview fallback
    if (!rawResults) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_KEY}`, {
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
        if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const text = data.candidates[0].content.parts[0].text.trim();
          const match = text.match(/\[.*\]/s);
          if (match) {
            rawResults = JSON.parse(match[0]);
          }
        }
      } catch (geminiPrevErr) {
        console.warn("Gemini preview attempt failed:", geminiPrevErr);
      }
    }

    // Tertiary: Groq fallback with openai/gpt-oss-20b
    if (!rawResults) {
      try {
        setStatusMessage('Evaluating with Groq openai/gpt-oss-20b...');
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [{
              role: "user",
              content: prompt
            }]
          })
        });

        const groqData = await groqRes.json();
        if (groqData.choices && groqData.choices[0]?.message?.content) {
          const text = groqData.choices[0].message.content.trim();
          const match = text.match(/\[.*\]/s);
          if (match) {
            rawResults = JSON.parse(match[0]);
          }
        }
      } catch (groqErr) {
        console.error("Groq fallback failed:", groqErr);
      }
    }

    if (rawResults && Array.isArray(rawResults) && rawResults.length > 0) {
      const processed: MathResultItem[] = rawResults.map((item, idx) => {
        // Calculate anchor position
        let rawEqX = item.equals_x_percent ? (item.equals_x_percent / 100) * containerWidth : (strokeMetrics ? strokeMetrics.maxX : containerWidth * 0.6);
        let rawEqY = item.equals_y_percent ? (item.equals_y_percent / 100) * containerHeight : (strokeMetrics ? strokeMetrics.centerY : containerHeight * 0.4);

        // Fallback refinement with actual strokes if within 1 item
        if (rawResults.length === 1 && strokeMetrics) {
          rawEqX = strokeMetrics.maxX;
          rawEqY = strokeMetrics.centerY;
        }

        // Text Baseline Matching: Font size proportional to handwriting height
        const boxHeight = item.approx_height_percent 
          ? (item.approx_height_percent / 100) * containerHeight 
          : (strokeMetrics ? strokeMetrics.height : 45);
        const fontSize = Math.max(26, Math.min(48, Math.round(boxHeight * 0.75)));

        // Margin Boundary and Wrapping Rules
        const rightMarginConstraint = containerWidth - 25;
        const charWidth = fontSize * 0.6;
        const estimatedWidth = (item.result.length + 2) * charWidth + 20;

        let finalX = rawEqX + 10; // Immediate succession: anchor directly right of '='
        let finalY = rawEqY;     // Baseline matching
        let isWrapped = false;

        // Rule 2: If expression is written too close to the right edge
        if (finalX + estimatedWidth > rightMarginConstraint) {
          isWrapped = true;
          // Smoothly drop to an aligned sub-line below the expression
          finalY = rawEqY + fontSize + 8;
          // Indented block below the expression rather than overflowing
          finalX = Math.max(25, Math.min(rawEqX - 25, rightMarginConstraint - estimatedWidth));
        }

        return {
          id: `res-${idx}-${Date.now()}`,
          original: item.original || '',
          result: String(item.result),
          graph: item.graph,
          x: Math.round(finalX),
          y: Math.round(finalY),
          fontSize,
          isWrapped,
          status: displayMode === 'insert' ? 'inserted' : 'suggested'
        };
      });

      setInlineResults(processed);
      setStatusMessage('');

      // Graph handling: only if enabled and explicit 2D function
      if (enableGraphing) {
        const graphCandidate = processed.find(r => isExplicit2DFunction(r.graph, r.original));
        if (graphCandidate && graphCandidate.graph) {
          generateGraph(graphCandidate.graph, graphCandidate.original);
        } else {
          setGraphData(null);
          setActiveGraphExpr('');
        }
      } else {
        setGraphData(null);
        setActiveGraphExpr('');
      }
    } else {
      setStatusMessage('No math detected. Try drawing clearly.');
    }

    setRecognizing(false);
  };

  const handleAcceptSuggest = (id: string) => {
    setInlineResults(prev => prev.map(r => r.id === id ? { ...r, status: 'inserted' } : r));
  };

  const handleDismissSuggest = (id: string) => {
    setInlineResults(prev => prev.filter(r => r.id !== id));
  };

  const generateGraph = (expr: string, origTitle?: string) => {
    const data = [];
    try {
      const cleanExpr = expr.replace(/^y\s*=\s*/i, '').replace(/^f\(x\)\s*=\s*/i, '');
      const compiled = math.compile(cleanExpr);
      for (let i = -10; i <= 10; i += 0.5) {
        const val = compiled.evaluate({ x: i });
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          data.push({ x: Number(i.toFixed(1)), y: Number(val.toFixed(2)) });
        }
      }
      if (data.length > 0) {
        setGraphData(data);
        setActiveGraphExpr(origTitle || expr);
      } else {
        setGraphData(null);
      }
    } catch(e) {
      console.warn("Could not generate graph:", e);
      setGraphData(null);
    }
  };

  return (
    <div className="math-notes-google">
      {/* Top Controls Toolbar */}
      <div className="notes-header-bar">
        <div className="notes-header-left">
          <span className="google-notes-title">Math Notes</span>
          <span className="google-notes-subtitle">Dynamic inline calculation & baseline placement</span>
        </div>
        
        <div className="notes-header-controls">
          {/* Display Mode Toggle: Insert vs Suggest */}
          <div className="display-mode-selector" title="Math Results Placement Mode">
            <span className="mode-label">Results:</span>
            <div className="mode-pill-toggle">
              <button 
                type="button"
                className={`mode-pill-btn ${displayMode === 'insert' ? 'active' : ''}`}
                onClick={() => setDisplayMode('insert')}
                title="Insert Results: Answer appears automatically inline after the equals sign"
              >
                Insert
              </button>
              <button 
                type="button"
                className={`mode-pill-btn ${displayMode === 'suggest' ? 'active' : ''}`}
                onClick={() => setDisplayMode('suggest')}
                title="Suggest Results: Action pill appears at '=' allowing manual placement"
              >
                Suggest
              </button>
            </div>
          </div>

          {/* Graph Toggle */}
          <button 
            className={`google-chip-btn ${enableGraphing ? 'active' : ''}`}
            onClick={() => setEnableGraphing(!enableGraphing)}
            title="Toggle Graph Generation"
          >
            <ChartIcon size={14} />
            <span>Graph: {enableGraphing ? 'ON' : 'OFF'}</span>
          </button>
          
          {/* Clear Canvas */}
          <button className="google-icon-btn" onClick={clearCanvas} title="Clear Canvas">
            <RotateCcw size={15} />
            <span>Clear</span>
          </button>
          
          {/* Manual Solve Button */}
          <button 
            className="google-btn-primary" 
            onClick={recognizeMath} 
            disabled={recognizing}
            title="Solve handwritten math immediately"
          >
            <Calculator size={15} />
            <span>{recognizing ? 'Solving...' : 'Solve'}</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="notes-status-chip">
          {recognizing && <span className="notes-spinner"></span>}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Canvas Drawing Area with Inline Results Overlay */}
      <div className="canvas-container" ref={containerRef}>
        <SignatureCanvas 
          ref={sigPad}
          penColor="#8ab4f8"
          minWidth={2}
          maxWidth={4.5}
          velocityFilterWeight={0.7}
          onEnd={handleDrawEnd}
          canvasProps={{ className: 'notes-canvas' }}
        />

        {/* Dynamic Inline Anchored Results */}
        {inlineResults.map((item) => {
          const isBoolTrue = item.result.toLowerCase() === 'true';
          const isBoolFalse = item.result.toLowerCase() === 'false';

          if (item.status === 'suggested') {
            // Suggest Mode: Small "Solve" action pill adjacent to '='
            return (
              <div 
                key={item.id}
                className={`suggest-action-pill ${item.isWrapped ? 'wrapped' : ''}`}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y - 14}px`,
                }}
              >
                <button 
                  className="suggest-solve-btn"
                  onClick={() => handleAcceptSuggest(item.id)}
                  title="Insert result inline"
                >
                  <span className="suggest-dot"></span>
                  <span className="suggest-label">Solve:</span>
                  <span className={`suggest-value ${isBoolTrue ? 'text-true' : isBoolFalse ? 'text-false' : ''}`}>
                    {item.result}
                  </span>
                </button>
                <button 
                  className="suggest-dismiss-btn"
                  onClick={() => handleDismissSuggest(item.id)}
                  title="Dismiss suggestion"
                >
                  <X size={12} />
                </button>
              </div>
            );
          }

          // Insert Mode: Immediate succession baseline matching inline text
          return (
            <div 
              key={item.id}
              className={`inline-math-result ${item.isWrapped ? 'wrapped-subline' : 'immediate-inline'}`}
              style={{
                left: `${item.x}px`,
                top: `${item.y - Math.round(item.fontSize * 0.45)}px`,
                fontSize: `${item.fontSize}px`,
              }}
            >
              {item.isWrapped && <span className="indent-arrow">↳</span>}
              <span className={`handwritten-replica ${isBoolTrue ? 'bool-true' : isBoolFalse ? 'bool-false' : 'num-val'}`}>
                {isBoolTrue && <Check size={Math.round(item.fontSize * 0.7)} style={{ display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} />}
                {item.result}
              </span>
              <button 
                className="inline-remove-btn" 
                onClick={() => handleDismissSuggest(item.id)}
                title="Remove result"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Graph Overlay with dismiss button */}
      {graphData && (
        <div className="google-graph-card">
          <div className="graph-card-header">
            <span className="graph-title">Plot: {activeGraphExpr}</span>
            <button className="close-mini-btn" onClick={() => setGraphData(null)} title="Close graph">
              <X size={16} />
            </button>
          </div>
          <div className="graph-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3c4043" />
                <XAxis dataKey="x" stroke="#9aa0a6" fontSize={12} />
                <YAxis stroke="#9aa0a6" fontSize={12} />
                <Tooltip contentStyle={{ background: '#303134', border: '1px solid #5f6368', borderRadius: 4, color: '#e8eaed' }} />
                <Line type="monotone" dataKey="y" stroke="#8ab4f8" dot={false} strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default MathNotes;
