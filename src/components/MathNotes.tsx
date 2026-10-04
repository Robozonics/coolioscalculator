import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, PenTool } from 'lucide-react';
import Tesseract from 'tesseract.js';
import * as math from 'mathjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Simple scope for variable assignment
const scope: any = {};

const MathNotes: React.FC = () => {
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
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      
      // Use Tesseract to recognize text (handwriting OCR is hard for basic Tesseract, 
      // but works okay for clear block letters/numbers).
      const { data: { text } } = await Tesseract.recognize(
        dataUrl,
        'eng',
        { logger: m => console.log(m) }
      );
      
      const cleanText = text.replace(/\s+/g, '').replace(/[O]/g, '0'); // Basic cleanup
      console.log("Recognized:", cleanText);

      // Evaluate logic
      // Check for variable assignment (e.g., x=10)
      if (cleanText.includes('=')) {
        const parts = cleanText.split('=');
        if (parts.length === 2 && parts[1] !== '') {
          // If it's something like y=x^2 (graph)
          if (parts[1].includes('x') && parts[0] === 'y') {
            generateGraph(parts[1]);
            setMathResult(`Graphing: ${cleanText}`);
          } 
          // If it's a variable assignment like x=5
          else if (isNaN(Number(parts[0]))) {
            const val = math.evaluate(parts[1], scope);
            scope[parts[0]] = val;
            setMathResult(`${parts[0]} = ${val}`);
          }
          // If it's an equation end like 5+5=
          else {
            const res = math.evaluate(parts[0], scope);
            setMathResult(`${res}`);
          }
        } else if (parts[1] === '') {
           // like 5+5=
           const res = math.evaluate(parts[0], scope);
           setMathResult(`= ${res}`);
        }
      } else {
        // Just an expression
        const res = math.evaluate(cleanText, scope);
        setMathResult(`= ${res}`);
      }

    } catch (e) {
      console.error(e);
      setMathResult("Couldn't parse math.");
    }
    setRecognizing(false);
  };

  const generateGraph = (expr: string) => {
    const data = [];
    try {
      const compiled = math.compile(expr);
      for (let i = -10; i <= 10; i += 0.5) {
        data.push({
          x: i,
          y: compiled.evaluate({ x: i })
        });
      }
      setGraphData(data);
    } catch(e) {
      console.error("Graph err", e);
    }
  };

  return (
    <div className="math-notes-container">
      <div className="math-notes-overlay">
        <h2 style={{ opacity: 0.5 }}>Math Notes</h2>
        <p style={{ opacity: 0.5, fontSize: 14 }}>Draw equations (e.g., 2+2=, x=5, y=x^2)</p>
        
        {recognizing && <div style={{ color: '#ff9f0a' }}>Thinking...</div>}
        {mathResult && (
          <div style={{ color: '#ff9f0a', fontSize: 32, fontWeight: 'bold', marginTop: 10 }}>
            {mathResult}
          </div>
        )}
      </div>

      <div className="canvas-wrapper">
        <SignatureCanvas 
          ref={sigPad}
          penColor="white"
          canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }}
          onEnd={() => {
            // Auto recognize after drawing delay could be added here
            setTimeout(recognizeMath, 1000);
          }}
        />
      </div>

      {graphData && (
        <div style={{ position: 'absolute', bottom: 100, right: 20, width: 300, height: 200, background: 'rgba(0,0,0,0.8)', borderRadius: 12, padding: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="x" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#ff9f0a" dot={false} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="notes-tools">
        <button className="notes-btn" onClick={clearCanvas} title="Clear">
          <RotateCcw size={20} />
        </button>
        <button className="notes-btn" style={{ color: '#ff9f0a' }} title="Pen">
          <PenTool size={20} />
        </button>
        {/* Force Evaluation button (just in case auto fails) */}
        <button className="notes-btn" onClick={recognizeMath} style={{ fontSize: 18, fontWeight: 'bold' }}>
          =
        </button>
      </div>
    </div>
  );
};

export default MathNotes;
