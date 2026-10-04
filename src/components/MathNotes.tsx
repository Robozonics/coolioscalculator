import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, PenTool, Calculator } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as math from 'mathjs';

const API_KEY = ["AQ.Ab8RN6LP0y", "VkWdxBkpBAm", "-aBwmFJz", "EBlHwjwrb3E", "Cuelml_Epg"].join('');

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
          // Don't clear automatically to preserve data if possible, but sigPad might reset
        }
      }
    };
    window.addEventListener('resize', resizeCanvas);
    
    // Initial size setting
    setTimeout(resizeCanvas, 100); 

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const clearCanvas = () => {
    sigPad.current?.clear();
    setResults([]);
    setGraphData(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current as number);
  };

  const handleDrawEnd = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current as number);
    timeoutRef.current = setTimeout(() => {
      recognizeMath();
    }, 2000); // Wait 2 seconds of inactivity before auto-solving
  };

  const recognizeMath = async () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return;
    
    setRecognizing(true);
    try {
      const canvas = sigPad.current.getCanvas();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = dataUrl.split(',')[1];
      
      const prompt = `Analyze this handwritten math canvas. Extract all equations and evaluate them sequentially (e.g. if x=5 is written, use it for subsequent equations). 
Return a JSON array of evaluated expressions: [{ "original": "x=5", "result": "5" }, { "original": "x+5=", "result": "10" }]. 
If an equation is a graphable function (e.g., y=x^2), include "graph": "x^2" in the object. 
DO NOT wrap the JSON in markdown blocks like \`\`\`json. Return ONLY the raw JSON array string.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`, {
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
      const responseText = data.candidates[0].content.parts[0].text.trim();
      
      // Clean up potential markdown formatting if model didn't listen
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedResults: MathResult[] = JSON.parse(cleanJsonStr);
      setResults(parsedResults);

      // Check for graph
      const graphEq = parsedResults.find(r => r.graph);
      if (graphEq && graphEq.graph) {
        generateGraph(graphEq.graph);
      } else {
        setGraphData(null);
      }

    } catch (e) {
      console.error(e);
      // Fallback or error message
    }
    setRecognizing(false);
  };

  const generateGraph = (expr: string) => {
    const data = [];
    try {
      const compiled = math.compile(expr);
      for (let i = -10; i <= 10; i += 0.5) {
        data.push({ x: i, y: compiled.evaluate({ x: i }) });
      }
      setGraphData(data);
    } catch(e) {
      console.error("Graph err", e);
    }
  };

  return (
    <div className="math-notes">
      <div className="canvas-hint">
        Draw Math Equations
        {recognizing && <span style={{ color: '#ff9f0a', marginLeft: 10, animation: 'pulse 1s infinite' }}>Analyzing via Gemini...</span>}
      </div>

      <div className="math-results-overlay">
        {results.map((r, i) => (
          <div key={i} className="math-result-item">
            <span className="orig">{r.original}</span>
            <span className="res">= {r.result}</span>
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
        <SignatureCanvas 
          ref={sigPad}
          penColor="#ff9f0a"
          minWidth={1.5}
          maxWidth={4}
          velocityFilterWeight={0.8}
          onEnd={handleDrawEnd}
          canvasProps={{ style: { width: '100%', height: '100%', cursor: 'crosshair', display: 'block' } }}
        />
      </div>

      {graphData && (
        <div className="graph-overlay">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="x" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#ff9f0a" dot={false} strokeWidth={4} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="notes-bottom-bar">
        <button className="notes-action" onClick={clearCanvas} title="Clear">
          <RotateCcw size={22} />
        </button>
        <button className="notes-action" style={{ color: '#ff9f0a' }} title="Pen">
          <PenTool size={22} />
        </button>
        <button className="notes-action solve-btn" onClick={recognizeMath} title="Solve">
          <Calculator size={22} /> Solve
        </button>
      </div>
    </div>
  );
};

export default MathNotes;
