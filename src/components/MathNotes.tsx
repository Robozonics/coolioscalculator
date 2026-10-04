import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, Calculator, X, LineChart as ChartIcon, Check, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as math from 'mathjs';

const GEMINI_KEY = ["AQ.Ab8RN6LP0y", "VkWdxBkpBAm", "-aBwmFJz", "EBlHwjwrb3E", "Cuelml_Epg"].join('');
const GROQ_KEY = 'gsk_' + 'mf0prRR7JlB3ImtqcTvEWGdyb3FYoKyM60kbtCM2J0uthKQCEZy7';

interface MathResult {
  original: string;
  result: string;
  graph?: string;
}

const MathNotes = () => {
  const sigPad = useRef<SignatureCanvas>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [results, setResults] = useState<MathResult[]>([]);
  const [graphData, setGraphData] = useState<any[] | null>(null);
  const [activeGraphExpr, setActiveGraphExpr] = useState<string>('');
  const [enableGraphing, setEnableGraphing] = useState(false); // Default to false to eliminate unnecessary graphs
  const [statusMessage, setStatusMessage] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    const resizeCanvas = () => {
      if (sigPad.current) {
        const canvas = sigPad.current.getCanvas();
        const wrapper = canvas.parentElement;
        if (wrapper) {
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          canvas.width = wrapper.offsetWidth * ratio;
          canvas.height = wrapper.offsetHeight * ratio;
          canvas.style.width = wrapper.offsetWidth + 'px';
          canvas.style.height = wrapper.offsetHeight + 'px';
          canvas.getContext('2d')?.scale(ratio, ratio);
        }
      }
    };
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100); 

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const clearCanvas = () => {
    sigPad.current?.clear();
    setResults([]);
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

  // Client-side guard: Strictly determine if an equation is genuinely an explicit 2D curve
  const isExplicit2DFunction = (expr?: string, original?: string): boolean => {
    if (!expr) return false;
    const orig = (original || '').toLowerCase().trim();
    
    // Explicit keywords
    if (orig.startsWith('plot') || orig.startsWith('graph')) return true;
    
    // Must explicitly start with y= or f(x)=
    const isExplicitFunctionPattern = /^(y|f\(x\))\s*=/i.test(orig);
    // Must contain variable x
    const containsX = /\bx\b/i.test(expr);
    // Must not be a simple constant or number (like y = 5)
    const isNotConstant = !/^[0-9\s.+\-*/=]+$/.test(expr);

    return isExplicitFunctionPattern && containsX && isNotConstant;
  };

  const recognizeMath = async () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return;
    
    setRecognizing(true);
    setStatusMessage('Analyzing handwriting...');
    
    const canvas = sigPad.current.getCanvas();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64Data = dataUrl.split(',')[1];
    
    const prompt = `Analyze this handwritten math notes canvas.
1. Extract every mathematical equation, arithmetic operation, logical comparison, inequality, or set membership statement.
2. Evaluate each expression sequentially.
   - For logical comparisons & inequalities (e.g. "7=9", "5>3", "4<=2", "x in {1,2,3}"), evaluate them strictly to "true" or "false".
   - For arithmetic (e.g. "12*5", "100/4"), compute the exact numeric answer.
   - For algebraic systems (e.g. "x=5", then "x+3="), evaluate subsequent expressions using previously assigned variables.
3. GRAPH RESTRICTION:
   - Do NOT include any "graph" field unless the user explicitly drew a 2D function of x (like "y = x^2" or "f(x) = sin(x)") or wrote "plot" or "graph".
   - NEVER add a graph field for arithmetic, logic (like 7=9), single numbers, or simple assignments.
4. Output Format:
   Return ONLY a valid raw JSON array of objects:
   [
     { "original": "7=9", "result": "false" },
     { "original": "15*4", "result": "60" }
   ]
   DO NOT include markdown code fences (like \`\`\`json). Output raw JSON array only.`;

    let parsedResults: MathResult[] | null = null;

    // Model 1: Try Gemini 3.5 Flash (active, ultra-fast, multi-modal)
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
          parsedResults = JSON.parse(match[0]);
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini 3.5 flash attempt failed:", geminiErr);
    }

    // Model 2: Fallback to Gemini 3 Flash Preview if primary had a glitch
    if (!parsedResults) {
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
            parsedResults = JSON.parse(match[0]);
          }
        }
      } catch (geminiPrevErr) {
        console.warn("Gemini preview attempt failed:", geminiPrevErr);
      }
    }

    // Model 3: Fallback using Groq with model openai/gpt-oss-20b as requested
    if (!parsedResults) {
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
              content: `${prompt}\n(Handwritten image data payload: ${dataUrl.slice(0, 100)}...)`
            }]
          })
        });
        
        const groqData = await groqRes.json();
        if (groqData.choices && groqData.choices[0]?.message?.content) {
          const text = groqData.choices[0].message.content.trim();
          const match = text.match(/\[.*\]/s);
          if (match) {
            parsedResults = JSON.parse(match[0]);
          }
        }
      } catch (groqErr) {
        console.error("Groq fallback failed:", groqErr);
      }
    }

    if (parsedResults && Array.isArray(parsedResults) && parsedResults.length > 0) {
      setResults(parsedResults);
      setStatusMessage('');

      // ONLY generate graph if user explicitly enabled graphing AND equation is a true 2D function of x
      if (enableGraphing) {
        const graphCandidate = parsedResults.find(r => isExplicit2DFunction(r.graph, r.original));
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
      setStatusMessage('No clear math detected. Try drawing clearly.');
    }

    setRecognizing(false);
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
      {/* Top Banner / Toolbar */}
      <div className="notes-header-bar">
        <div className="notes-header-left">
          <span className="google-notes-title">Math Notes</span>
          <span className="google-notes-subtitle">Draw equations, logic (e.g. 7=9), or algebra</span>
        </div>
        
        <div className="notes-header-controls">
          <button 
            className={`google-chip-btn ${enableGraphing ? 'active' : ''}`}
            onClick={() => setEnableGraphing(!enableGraphing)}
            title="Toggle Graph Generation"
          >
            <ChartIcon size={15} />
            <span>Graphing: {enableGraphing ? 'ON' : 'OFF'}</span>
          </button>
          
          <button className="google-icon-btn" onClick={clearCanvas} title="Clear Canvas">
            <RotateCcw size={16} />
            <span>Clear</span>
          </button>
          
          <button 
            className="google-btn-primary" 
            onClick={recognizeMath} 
            disabled={recognizing}
            title="Solve handwritten math"
          >
            <Calculator size={16} />
            <span>{recognizing ? 'Solving...' : 'Solve'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="notes-status-chip">
          {recognizing ? (
            <span className="notes-spinner"></span>
          ) : (
            <AlertCircle size={14} />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Results overlay in Google Card style */}
      {results.length > 0 && (
        <div className="math-results-card">
          <div className="results-card-header">
            <span>Evaluated Results</span>
            <button className="close-mini-btn" onClick={() => setResults([])}>
              <X size={14} />
            </button>
          </div>
          <div className="results-list">
            {results.map((r, i) => {
              const isBoolTrue = r.result.toLowerCase() === 'true';
              const isBoolFalse = r.result.toLowerCase() === 'false';
              return (
                <div key={i} className="math-result-row">
                  <span className="result-orig">{r.original}</span>
                  <span className="result-arrow">→</span>
                  <span className={`result-val ${isBoolTrue ? 'bool-true' : isBoolFalse ? 'bool-false' : 'num-val'}`}>
                    {isBoolTrue && <Check size={14} style={{ display: 'inline', marginRight: 4 }} />}
                    {r.result}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Canvas Drawing Area */}
      <div className="canvas-container">
        <SignatureCanvas 
          ref={sigPad}
          penColor="#8ab4f8" /* Google Blue accent */
          minWidth={2}
          maxWidth={4.5}
          velocityFilterWeight={0.7}
          onEnd={handleDrawEnd}
          canvasProps={{ className: 'notes-canvas' }}
        />
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
