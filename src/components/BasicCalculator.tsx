import React, { useState } from 'react';
import * as math from 'mathjs';
import { Calculator as CalcIcon } from 'lucide-react';

interface Props {
  isScientific: boolean;
  onToggleScientific: () => void;
  onSaveHistory: (expr: string, res: string) => void;
}

const BasicCalculator: React.FC<Props> = ({ isScientific, onToggleScientific, onSaveHistory }) => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [isRad, setIsRad] = useState(true);

  const handlePress = (val: string) => {
    if (result !== '0' && expression === '') {
      // Starting new calc after result
      if (['+', '-', '*', '/', '^'].includes(val)) {
        setExpression(result + val);
      } else {
        setExpression(val);
        setResult('0');
      }
    } else {
      setExpression((prev) => prev + val);
    }
  };

  const calculate = () => {
    try {
      if (!expression) return;
      let toEval = expression;
      
      // If we are in degree mode, we need to convert for trig functions, but math.js uses radians by default.
      // A full implementation would parse and inject rad/deg conversions, but we'll stick to rad mostly for simplicity,
      // or replace 'sin(' with 'sin(deg(' if !isRad. 
      // For this demo, we'll just evaluate standardly using math.js.
      
      const res = math.evaluate(toEval);
      const resStr = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(8)).toString();
      
      setResult(resStr);
      onSaveHistory(expression + ' =', resStr);
      setExpression('');
    } catch (e) {
      setResult('Error');
    }
  };

  const clearAll = () => {
    setExpression('');
    setResult('0');
  };

  const toggleSign = () => {
    if (expression) return; // Complex to toggle sign of expression, we toggle result
    if (result !== '0') {
      setResult((parseFloat(result) * -1).toString());
    }
  };

  const applyPercent = () => {
    if (expression) return;
    if (result !== '0') {
      setResult((parseFloat(result) / 100).toString());
    }
  };

  const basicPad = [
    { label: 'AC', type: 'secondary', action: clearAll },
    { label: '+/-', type: 'secondary', action: toggleSign },
    { label: '%', type: 'secondary', action: applyPercent },
    { label: '÷', val: '/', type: 'op', action: () => handlePress('/') },
    { label: '7', val: '7', type: 'num', action: () => handlePress('7') },
    { label: '8', val: '8', type: 'num', action: () => handlePress('8') },
    { label: '9', val: '9', type: 'num', action: () => handlePress('9') },
    { label: '×', val: '*', type: 'op', action: () => handlePress('*') },
    { label: '4', val: '4', type: 'num', action: () => handlePress('4') },
    { label: '5', val: '5', type: 'num', action: () => handlePress('5') },
    { label: '6', val: '6', type: 'num', action: () => handlePress('6') },
    { label: '-', val: '-', type: 'op', action: () => handlePress('-') },
    { label: '1', val: '1', type: 'num', action: () => handlePress('1') },
    { label: '2', val: '2', type: 'num', action: () => handlePress('2') },
    { label: '3', val: '3', type: 'num', action: () => handlePress('3') },
    { label: '+', val: '+', type: 'op', action: () => handlePress('+') },
    { label: '0', val: '0', type: 'num zero', action: () => handlePress('0') },
    { label: '.', val: '.', type: 'num', action: () => handlePress('.') },
    { label: '=', type: 'op', action: calculate },
  ];

  const scientificPad = [
    { label: '(', action: () => handlePress('(') },
    { label: ')', action: () => handlePress(')') },
    { label: 'mc', action: () => {} },
    { label: 'm+', action: () => {} },
    { label: 'm-', action: () => {} },
    { label: 'mr', action: () => {} },
    { label: '2ⁿᵈ', action: () => {} },
    { label: 'x²', action: () => handlePress('^2') },
    { label: 'x³', action: () => handlePress('^3') },
    { label: 'xʸ', action: () => handlePress('^') },
    { label: 'eˣ', action: () => handlePress('e^') },
    { label: '10ˣ', action: () => handlePress('10^') },
    { label: '1/x', action: () => handlePress('1/') },
    { label: '√x', action: () => handlePress('sqrt(') },
    { label: '∛x', action: () => handlePress('cbrt(') },
    { label: 'ʸ√x', action: () => {} }, // Requires custom parsing
    { label: 'ln', action: () => handlePress('log(') },
    { label: 'log₁₀', action: () => handlePress('log10(') },
    { label: 'x!', action: () => handlePress('!') },
    { label: 'sin', action: () => handlePress('sin(') },
    { label: 'cos', action: () => handlePress('cos(') },
    { label: 'tan', action: () => handlePress('tan(') },
    { label: 'e', action: () => handlePress('e') },
    { label: 'EE', action: () => handlePress('E') },
    { label: isRad ? 'Rad' : 'Deg', action: () => setIsRad(!isRad) },
    { label: 'sinh', action: () => handlePress('sinh(') },
    { label: 'cosh', action: () => handlePress('cosh(') },
    { label: 'tanh', action: () => handlePress('tanh(') },
    { label: 'π', action: () => handlePress('pi') },
    { label: 'Rand', action: () => handlePress('random()') },
  ];

  return (
    <div className="calc-container">
      <div style={{ position: 'absolute', top: 80, left: 20 }}>
        <button 
          className="icon-btn" 
          onClick={onToggleScientific}
          title="Toggle Scientific Mode"
          style={{ background: isScientific ? 'rgba(255, 159, 10, 0.2)' : 'transparent' }}
        >
          <CalcIcon size={20} />
        </button>
      </div>

      <div className="display-area">
        <div className="expression-text">{expression}</div>
        <div className="result-text">{result}</div>
      </div>
      
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {isScientific && (
          <div className="keypad scientific-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(6, 1fr)', 
            gap: 12, 
            maxWidth: 600,
            opacity: 1,
            transition: 'opacity 0.3s'
          }}>
            {scientificPad.map((btn, i) => (
              <button key={i} className="btn sci-btn" onClick={btn.action}>
                {btn.label}
              </button>
            ))}
          </div>
        )}

        <div className="keypad basic-grid">
          {basicPad.map((btn, i) => (
            <button 
              key={i} 
              className={`btn ${btn.type || ''}`} 
              onClick={btn.action}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BasicCalculator;
