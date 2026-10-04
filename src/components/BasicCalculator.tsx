import { useState, useEffect } from 'react';
import * as math from 'mathjs';
import { Delete, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  isScientific?: boolean;
  onToggleScientific?: () => void;
}

const BasicCalculator = ({}: Props) => {
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState('Ans = 0');
  const [ans, setAns] = useState('0');
  const [isRad, setIsRad] = useState(true);
  const [isInv, setIsInv] = useState(false);
  const [justCalculated, setJustCalculated] = useState(false);
  const [showSciMobile, setShowSciMobile] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (/^[0-9.]$/.test(key)) {
        e.preventDefault();
        handleInput(key);
      } else if (key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (key === '-') {
        e.preventDefault();
        handleOperator('-');
      } else if (key === '*') {
        e.preventDefault();
        handleOperator('×');
      } else if (key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (key === '%') {
        e.preventDefault();
        handleOperator('%');
      } else if (key === '(' || key === ')') {
        e.preventDefault();
        handleInput(key);
      } else if (key === '^') {
        e.preventDefault();
        handleOperator('^');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
      } else if (key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (key === 'Escape') {
        e.preventDefault();
        clearAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [justCalculated, expression, ans, isRad]);

  const handleInput = (char: string) => {
    if (justCalculated) {
      setExpression(char);
      setJustCalculated(false);
    } else {
      setExpression(prev => prev + char);
    }
  };

  const handleOperator = (op: string) => {
    if (justCalculated) {
      setExpression(ans + ' ' + op + ' ');
      setJustCalculated(false);
    } else {
      setExpression(prev => {
        if (!prev) return '0 ' + op + ' ';
        return prev + ' ' + op + ' ';
      });
    }
  };

  const handleFunction = (func: string) => {
    if (justCalculated) {
      setExpression(func + '(' + ans + ')');
      setJustCalculated(false);
    } else {
      setExpression(prev => prev + func + '(');
    }
  };

  const clearAll = () => {
    setExpression('');
    setJustCalculated(false);
  };

  const backspace = () => {
    if (justCalculated) {
      setExpression('');
      setJustCalculated(false);
      return;
    }
    setExpression(prev => {
      const trimmed = prev.trimEnd();
      if (trimmed.endsWith('sin(') || trimmed.endsWith('cos(') || trimmed.endsWith('tan(') || trimmed.endsWith('log(')) {
        return trimmed.slice(0, -4);
      }
      if (trimmed.endsWith('asin(') || trimmed.endsWith('acos(') || trimmed.endsWith('atan(') || trimmed.endsWith('sqrt(')) {
        return trimmed.slice(0, -5);
      }
      return prev.slice(0, -1);
    });
  };

  const calculate = () => {
    if (!expression) return;
    try {
      // Prepare formula for mathjs
      let sanitized = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, 'pi')
        .replace(/Ans/g, ans);

      // Handle custom degree trigonometry if in Deg mode
      const customMath = math.create(math.all);
      if (!isRad) {
        customMath.import({
          sin: (x: number) => Math.sin((x * Math.PI) / 180),
          cos: (x: number) => Math.cos((x * Math.PI) / 180),
          tan: (x: number) => Math.tan((x * Math.PI) / 180),
          asin: (x: number) => (Math.asin(x) * 180) / Math.PI,
          acos: (x: number) => (Math.acos(x) * 180) / Math.PI,
          atan: (x: number) => (Math.atan(x) * 180) / Math.PI,
        }, { override: true });
      }

      const res = customMath.evaluate(sanitized);
      let resStr = '';
      if (typeof res === 'number') {
        if (Math.abs(res) < 1e-12 && Math.abs(res) > 0) resStr = '0';
        else if (Number.isInteger(res)) resStr = res.toString();
        else resStr = parseFloat(res.toPrecision(10)).toString();
      } else {
        resStr = String(res);
      }

      setHistory(expression + ' =');
      setAns(resStr);
      setExpression(resStr);
      setJustCalculated(true);
    } catch (err) {
      setHistory(expression + ' =');
      setExpression('Error');
      setJustCalculated(true);
    }
  };

  const currentDisplay = expression || '0';
  const displayLength = currentDisplay.length;
  const sizeClass = displayLength > 16 ? 'text-very-small' : displayLength > 10 ? 'text-small' : '';

  return (
    <div className="google-calc-container">
      {/* Display Screen */}
      <div className="google-display-box">
        <div className="google-display-history">{history}</div>
        <div className={`google-display-main ${sizeClass}`}>
          {currentDisplay}
        </div>
      </div>

      {/* Mobile Scientific Functions Toggle */}
      <div className="mobile-sci-toggle">
        <div className="rad-deg-pill">
          <button 
            type="button"
            className={`rad-deg-btn ${isRad ? 'active' : ''}`}
            onClick={() => setIsRad(true)}
          >
            Rad
          </button>
          <span className="rad-deg-divider">|</span>
          <button 
            type="button"
            className={`rad-deg-btn ${!isRad ? 'active' : ''}`}
            onClick={() => setIsRad(false)}
          >
            Deg
          </button>
        </div>

        <button 
          className="google-sci-expand-btn"
          onClick={() => setShowSciMobile(!showSciMobile)}
        >
          <span>Scientific</span>
          {showSciMobile ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Main 7-Column Google Calculator Keypad */}
      <div className={`google-keypad ${showSciMobile ? 'show-sci-mobile' : ''}`}>
        
        {/* Row 1 */}
        <div className="key-cell sci-cell rad-deg-cell">
          <div className="rad-deg-pill-desktop">
            <button 
              type="button"
              className={`rad-deg-btn ${isRad ? 'active' : ''}`}
              onClick={() => setIsRad(true)}
            >
              Rad
            </button>
            <span className="rad-deg-divider">|</span>
            <button 
              type="button"
              className={`rad-deg-btn ${!isRad ? 'active' : ''}`}
              onClick={() => setIsRad(false)}
            >
              Deg
            </button>
          </div>
        </div>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleInput('!')}>x!</button>
        <button className="g-btn g-btn-op" onClick={() => handleInput('(')}>(</button>
        <button className="g-btn g-btn-op" onClick={() => handleInput(')')}>)</button>
        <button className="g-btn g-btn-op" onClick={() => handleOperator('%')}>%</button>
        <button className="g-btn g-btn-op g-btn-ac" onClick={clearAll}>AC</button>
        <button className="g-btn g-btn-op g-btn-ce" onClick={backspace} title="Backspace">
          <Delete size={20} />
        </button>

        {/* Row 2 */}
        <button className={`g-btn g-btn-sci sci-cell ${isInv ? 'g-btn-active' : ''}`} onClick={() => setIsInv(!isInv)}>Inv</button>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleFunction(isInv ? 'asin' : 'sin')}>
          {isInv ? 'sin⁻¹' : 'sin'}
        </button>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => isInv ? handleOperator('e^') : handleFunction('log')}>
          {isInv ? 'eˣ' : 'ln'}
        </button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('7')}>7</button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('8')}>8</button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('9')}>9</button>
        <button className="g-btn g-btn-op" onClick={() => handleOperator('÷')}>÷</button>

        {/* Row 3 */}
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleInput('π')}>π</button>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleFunction(isInv ? 'acos' : 'cos')}>
          {isInv ? 'cos⁻¹' : 'cos'}
        </button>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => isInv ? handleOperator('10^') : handleFunction('log10')}>
          {isInv ? '10ˣ' : 'log'}
        </button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('4')}>4</button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('5')}>5</button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('6')}>6</button>
        <button className="g-btn g-btn-op" onClick={() => handleOperator('×')}>×</button>

        {/* Row 4 */}
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleInput('e')}>e</button>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleFunction(isInv ? 'atan' : 'tan')}>
          {isInv ? 'tan⁻¹' : 'tan'}
        </button>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => isInv ? handleOperator('^2') : handleFunction('sqrt')}>
          {isInv ? 'x²' : '√'}
        </button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('1')}>1</button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('2')}>2</button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('3')}>3</button>
        <button className="g-btn g-btn-op" onClick={() => handleOperator('−')}>−</button>

        {/* Row 5 */}
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleInput('Ans')}>Ans</button>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleOperator('e')}>EXP</button>
        <button className="g-btn g-btn-sci sci-cell" onClick={() => handleOperator('^')}>xʸ</button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('0')}>0</button>
        <button className="g-btn g-btn-num" onClick={() => handleInput('.')}>.</button>
        <button className="g-btn g-btn-equals" onClick={calculate}>=</button>
        <button className="g-btn g-btn-op" onClick={() => handleOperator('+')}>+</button>

      </div>
    </div>
  );
};

export default BasicCalculator;
