import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, PenTool, Calculator } from 'lucide-react';
import Tesseract from 'tesseract.js';
import * as math from 'mathjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const scope: any = {};

const MathNotes = () => {
  const sigPad = useRef<SignatureCanvas>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [mathResult, setMathResult] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any[] | null>(null);
  
  const clearCanvas = () => {
    sigPad.current?.clear();
    setMathResult(null);
    setGraphData(null);
  };

  const recognizeMath = async () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return;
    
    setRecognizing(true);
    try {
      // FIX: Use getCanvas() instead of getTrimmedCanvas() which was crashing
      const canvas = sigPad.current.getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      
      const { data: { text } } = await Tesseract.recognize(
        dataUrl,
        'eng',
        { logger: () => {} }
      );
      
      const cleanText = text.replace(/\s+/g, '').replace(/[O]/g, '0').toLowerCase();
      console.log("Recognized Math:", cleanText);

      if (cleanText.includes('=')) {
        const parts = cleanText.split('=');
        if (parts.length === 2 && parts[1] !== '') {
          if (parts[1].includes('x') && parts[0] === 'y') {
            generateGraph(parts[1]);
            setMathResult(`Graph: y = ${parts[1]}`);
          } 
          else if (isNaN(Number(parts[0]))) {
            const val = math.evaluate(parts[1], scope);
            scope[parts[0]] = val;
            setMathResult(`${parts[0]} = ${val}`);
          }
          else {
            const res = math.evaluate(parts[0], scope);
            setMathResult(`${parts[0]} = ${res}`);
          }
        } else if (parts[1] === '') {
           const res = math.evaluate(parts[0], scope);
           setMathResult(`${parts[0]} = ${res}`);
        }
      } else {
        const res = math.evaluate(cleanText, scope);
        setMathResult(`${cleanText} = ${res}`);
      }

    } catch (e) {
      console.error(e);
      setMathResult("Draw clearly: e.g. 5+5=");
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
        {recognizing && <span style={{ color: '#ff9f0a', marginLeft: 10 }}>Scanning...</span>}
        {mathResult && (
          <div style={{ color: '#ff9f0a', fontSize: 28, marginTop: 10 }}>
            {mathResult}
          </div>
        )}
      </div>

      <SignatureCanvas 
        ref={sigPad}
        penColor="#ff9f0a"
        minWidth={2}
        maxWidth={4}
        canvasProps={{ style: { width: '100%', height: '100%', cursor: 'crosshair' } }}
      />

      {graphData && (
        <div style={{ position: 'absolute', bottom: 100, right: 30, width: 350, height: 250, background: 'rgba(0,0,0,0.8)', borderRadius: 20, padding: 15, border: '1px solid rgba(255,255,255,0.1)' }}>
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
        <button className="notes-action" onClick={recognizeMath} title="Solve">
          <Calculator size={22} />
        </button>
      </div>
    </div>
  );
};

export default MathNotes;
