import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  History, 
  Sparkles, 
  Delete, 
  Volume2, 
  VolumeX, 
  Copy, 
  ArrowLeftRight, 
  X, 
  LayoutGrid, 
  Divide, 
  X as Times, 
  Minus, 
  Plus, 
  Equal 
} from 'lucide-react';
import * as math from 'mathjs';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
  tag?: string;
}

type KeypadMode = 'standard' | 'scientific';

export const GenZCalculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [expressionTrail, setExpressionTrail] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: 'h1', expression: '128 × 3.5', result: '448', timestamp: 'Just now', tag: '✨ clean' },
    { id: 'h2', expression: '450 + 20%', result: '540', timestamp: '2m ago', tag: '🔥 fire' },
    { id: 'h3', expression: '2^8 - 56', result: '200', timestamp: '5m ago' }
  ]);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'history' | 'converter'>('history');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [keypadMode, setKeypadMode] = useState<KeypadMode>('standard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [vibeStatus, setVibeStatus] = useState<string>('all vibes immaculate ✨');
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [radDeg, setRadDeg] = useState<'RAD' | 'DEG'>('DEG');
  const [activeWidgetCorner, setActiveWidgetCorner] = useState<'center' | 'compact'>('center');

  // Quick converter state
  const [convertCat, setConvertCat] = useState<'currency' | 'length' | 'temp'>('currency');
  const [convertVal, setConvertVal] = useState<number>(100);
  const [convertFrom, setConvertFrom] = useState('USD');
  const [convertTo, setConvertTo] = useState('EUR');

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Organic soft tactile sound effect generator via Web Audio API
  const playTactilePop = useCallback((freq = 520, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.45, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.055);
      }
    } catch {
      // Audio not permitted or not supported
    }
  }, [soundEnabled]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Live preview evaluation
  useEffect(() => {
    if (display === '0' || display === '' || ['+', '-', '×', '÷', '^', '('].some(op => display.endsWith(op))) {
      setPreviewResult(null);
      return;
    }

    try {
      const normalized = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, 'pi')
        .replace(/√\(([^)]+)\)/g, 'sqrt($1)');

      // Evaluate safely
      const res = math.evaluate(normalized);
      if (typeof res === 'number' && isFinite(res) && String(res) !== display) {
        setPreviewResult(parseFloat(res.toPrecision(8)).toString());
      } else {
        setPreviewResult(null);
      }
    } catch {
      setPreviewResult(null);
    }
  }, [display]);

  // Handle number & operator input
  const handleInput = (val: string) => {
    playTactilePop(val === '=' ? 780 : 540);
    setPressedKey(val);
    setTimeout(() => setPressedKey(null), 140);

    // If an error state is active, clear it first
    if (display.includes('vibe') || display.includes('math isn') || display.includes('Error')) {
      setDisplay(val);
      setVibeStatus('fresh start bb ✨');
      return;
    }

    if (val === 'AC') {
      setDisplay('0');
      setExpressionTrail('');
      setPreviewResult(null);
      setVibeStatus('clean slate ✨');
      showToast('clean slate ✨');
      return;
    }

    if (val === '⌫') {
      if (display.length <= 1) {
        setDisplay('0');
      } else {
        setDisplay(prev => prev.slice(0, -1));
      }
      return;
    }

    if (val === '=') {
      executeCalculation();
      return;
    }

    if (val === '+/-') {
      if (display === '0') return;
      if (display.startsWith('-')) {
        setDisplay(display.slice(1));
      } else {
        setDisplay('-' + display);
      }
      return;
    }

    if (val === '%') {
      try {
        const num = parseFloat(display);
        if (!isNaN(num)) {
          setDisplay((num / 100).toString());
        }
      } catch {
        setDisplay('0');
      }
      return;
    }

    // Normal character append
    if (['+', '−', '×', '÷', '^'].includes(val)) {
      setVibeStatus("cookin' up 🍳");
    } else if (vibeStatus.includes('fresh') || vibeStatus.includes('clean') || vibeStatus.includes('served')) {
      setVibeStatus("all vibes immaculate ✨");
    }

    setDisplay(prev => {
      if (prev === '0' && !['.', '+', '−', '×', '÷', '^', '%'].includes(val)) {
        return val;
      }
      // Avoid double operators
      if (['+', '−', '×', '÷'].includes(val) && ['+', '−', '×', '÷'].includes(prev.slice(-1))) {
        return prev.slice(0, -1) + val;
      }
      return prev + val;
    });
  };

  // Perform full evaluation with Gen Z response copy
  const executeCalculation = () => {
    playTactilePop(840, 'triangle');
    setExpressionTrail(display);

    try {
      const normalized = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, 'pi')
        .replace(/e/g, 'e')
        .replace(/√\(([^)]+)\)/g, 'sqrt($1)');

      // Check division by zero
      if (/\/0(?![0-9.])/.test(normalized)) {
        setDisplay('vibe check failed 💀');
        setVibeStatus('zero division is illegal 🙅');
        return;
      }

      const res = math.evaluate(normalized);

      if (res === undefined || (typeof res === 'number' && isNaN(res))) {
        setDisplay("math isn't mathing 💅");
        setVibeStatus('check those brackets bb');
        return;
      }

      if (typeof res === 'number' && !isFinite(res)) {
        setDisplay('infinite energy ⚡');
        setVibeStatus('numbers went to infinity and beyond');
        return;
      }

      let formatted = '';
      if (typeof res === 'number') {
        if (Number.isInteger(res)) formatted = res.toString();
        else formatted = parseFloat(res.toPrecision(10)).toString();
      } else {
        formatted = String(res);
      }

      // Playful Easter egg tags
      let tag = '⚡ valid';
      if (formatted === '420') tag = '🌿 high vibes';
      else if (formatted === '69') tag = '👀 nice';
      else if (formatted === '777') tag = '🎰 jackpot';
      else if (formatted === '100') tag = '💯 keep it 100';

      // Update state
      setDisplay(formatted);
      setPreviewResult(null);
      setVibeStatus('equation served hot 🔥');

      // Prepend to history
      const newHistoryItem: HistoryItem = {
        id: `h-${Date.now()}`,
        expression: display,
        result: formatted,
        timestamp: 'Just now',
        tag
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);
    } catch (err) {
      setDisplay("math isn't mathing 💅");
      setVibeStatus('syntax check needed');
    }
  };

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key >= '0' && e.key <= '9') handleInput(e.key);
      else if (e.key === '.') handleInput('.');
      else if (e.key === '+') handleInput('+');
      else if (e.key === '-') handleInput('−');
      else if (e.key === '*') handleInput('×');
      else if (e.key === '/') { e.preventDefault(); handleInput('÷'); }
      else if (e.key === '%') handleInput('%');
      else if (e.key === '^') handleInput('^');
      else if (e.key === '(' || e.key === ')') handleInput(e.key);
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleInput('='); }
      else if (e.key === 'Backspace') handleInput('⌫');
      else if (e.key === 'Escape') handleInput('AC');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display]);

  // Copy Display
  const copyDisplay = () => {
    navigator.clipboard?.writeText(display);
    showToast('copied to clipboard bb 📋');
  };

  // Insert from history
  const recallHistory = (item: HistoryItem) => {
    setDisplay(item.result);
    setExpressionTrail(`${item.expression} =`);
    showToast(`loaded ${item.result} ✨`);
    playTactilePop(640);
  };

  // Dynamic Display Font Sizing
  const getDisplayFontSize = () => {
    const len = display.length;
    if (len <= 8) return 'clamp(38px, 6.5vw, 56px)';
    if (len <= 12) return 'clamp(28px, 5vw, 42px)';
    if (len <= 16) return 'clamp(22px, 3.8vw, 32px)';
    return 'clamp(18px, 3vw, 24px)';
  };

  // Quick Unit Conversion Rates
  const getConvertedOutput = () => {
    if (convertCat === 'currency') {
      // Mock instant rates
      const rates: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.78, JPY: 155.2, INR: 83.5, CAD: 1.36 };
      const fromRate = rates[convertFrom] || 1;
      const toRate = rates[convertTo] || 1;
      const inUSD = convertVal / fromRate;
      return (inUSD * toRate).toFixed(2);
    }
    if (convertCat === 'temp') {
      if (convertFrom === 'C' && convertTo === 'F') return ((convertVal * 9/5) + 32).toFixed(1);
      if (convertFrom === 'F' && convertTo === 'C') return (((convertVal - 32) * 5/9)).toFixed(1);
      return convertVal.toString();
    }
    if (convertCat === 'length') {
      const meters: Record<string, number> = { m: 1, ft: 0.3048, km: 1000, mi: 1609.34 };
      const mVal = convertVal * (meters[convertFrom] || 1);
      return (mVal / (meters[convertTo] || 1)).toFixed(2);
    }
    return '0';
  };

  return (
    <div className={`genz-calc-page ${activeWidgetCorner}`}>
      {/* Ambient Neon-Pastel Gradient Orbs (Ultra-modern glass background) */}
      <div className="ambient-orbs-container" aria-hidden="true">
        <div className="ambient-orb orb-lavender" />
        <div className="ambient-orb orb-mint" />
        <div className="ambient-orb orb-coral" />
      </div>

      {/* Floating Status Toast */}
      {toastMessage && (
        <div className="genz-toast-pill">
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Glassmorphic Calculator Card */}
      <div className="genz-glass-card">
        {/* Mobile Sheet Drag Indicator */}
        <div className="mobile-sheet-pill-handle" aria-hidden="true" />
        
        {/* Card Header Bar */}
        <header className="genz-card-header">
          <div className="header-brand-group">
            <span className="genz-neon-dot" />
            <span className="genz-brand-title">aura.calc</span>
            <span className="genz-vibe-tag">{vibeStatus}</span>
          </div>

          <div className="header-controls-group">
            {/* Sound Toggle */}
            <button 
              className={`genz-icon-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                showToast(next ? 'sound on 🔊' : 'sound muted 🔇');
              }}
              title={soundEnabled ? 'Sound Enabled' : 'Sound Muted'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Scientific Drawer Toggle */}
            <button 
              className={`genz-icon-btn ${keypadMode === 'scientific' ? 'active' : ''}`}
              onClick={() => {
                const next = keypadMode === 'standard' ? 'scientific' : 'standard';
                setKeypadMode(next);
                playTactilePop(600);
              }}
              title="Toggle Scientific Math Drawer"
            >
              <Sparkles size={16} />
            </button>

            {/* Side Drawer Toggle (History & Converter) */}
            <button 
              className={`genz-icon-btn ${isSidePanelOpen ? 'active' : ''}`}
              onClick={() => {
                setIsSidePanelOpen(!isSidePanelOpen);
                playTactilePop(560);
              }}
              title="Toggle History & Units Drawer"
            >
              <History size={16} />
              {history.length > 0 && <span className="history-badge-dot" />}
            </button>

            {/* Desktop Widget Mode (Compact vs Center) */}
            <button 
              className={`genz-icon-btn desktop-only ${activeWidgetCorner === 'compact' ? 'active' : ''}`}
              onClick={() => setActiveWidgetCorner(activeWidgetCorner === 'center' ? 'compact' : 'center')}
              title={activeWidgetCorner === 'center' ? 'Compact Widget View' : 'Center Modular View'}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </header>

        {/* Floating Mini History Ticker */}
        <div className="genz-history-ticker">
          {expressionTrail && (
            <div className="ticker-trail">
              <span className="trail-text">{expressionTrail}</span>
            </div>
          )}
          <div className="ticker-chips-row">
            {history.slice(0, 3).map(item => (
              <button 
                key={item.id} 
                className="ticker-chip"
                onClick={() => recallHistory(item)}
                title="Tap to insert"
              >
                <span className="chip-expr">{item.expression}</span>
                <span className="chip-eq">=</span>
                <span className="chip-res">{item.result}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Borderless Flush-Right Display Area */}
        <div className="genz-display-wrapper" onClick={copyDisplay} title="Click to copy answer">
          {/* Live Preview / Subtitle */}
          <div className="display-preview-row">
            {previewResult && (
              <span className="display-preview-bubble">
                ≈ {previewResult}
              </span>
            )}
            <button className="copy-action-pill" onClick={(e) => { e.stopPropagation(); copyDisplay(); }}>
              <Copy size={12} />
              <span>copy</span>
            </button>
          </div>

          {/* Big Number Typography */}
          <div 
            className="display-main-digits"
            style={{ fontSize: getDisplayFontSize() }}
          >
            {display}
          </div>
        </div>

        {/* Keypad Container (4x5 tactile oversized pill buttons) */}
        <div className="genz-keypad-container">
          
          {/* Collapsible Scientific Secondary Row */}
          {keypadMode === 'scientific' && (
            <div className="scientific-strip-row">
              <button className="pill-btn sci-btn" onClick={() => setRadDeg(radDeg === 'RAD' ? 'DEG' : 'RAD')}>
                {radDeg}
              </button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('sin(')}>sin</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('cos(')}>cos</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('tan(')}>tan</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('ln(')}>ln</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('log(')}>log</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('√(')}>√</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('π')}>π</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('^')}>xʸ</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput('(')}>(</button>
              <button className="pill-btn sci-btn" onClick={() => handleInput(')')}>)</button>
            </div>
          )}

          {/* Primary 4x5 Keypad Grid with Tactile Pill Radii */}
          <div className="keypad-primary-grid">
            
            {/* Row 1: AC, ⌫, %, ÷ */}
            <button 
              className={`pill-btn btn-coral ${pressedKey === 'AC' ? 'btn-active' : ''}`}
              onClick={() => handleInput('AC')}
            >
              AC
            </button>
            <button 
              className={`pill-btn btn-secondary ${pressedKey === '⌫' ? 'btn-active' : ''}`}
              onClick={() => handleInput('⌫')}
            >
              <Delete size={20} />
            </button>
            <button 
              className={`pill-btn btn-secondary ${pressedKey === '%' ? 'btn-active' : ''}`}
              onClick={() => handleInput('%')}
            >
              %
            </button>
            <button 
              className={`pill-btn btn-operator ${pressedKey === '÷' ? 'btn-active' : ''}`}
              onClick={() => handleInput('÷')}
            >
              <Divide size={22} />
            </button>

            {/* Row 2: 7, 8, 9, × */}
            <button className={`pill-btn btn-num ${pressedKey === '7' ? 'btn-active' : ''}`} onClick={() => handleInput('7')}>7</button>
            <button className={`pill-btn btn-num ${pressedKey === '8' ? 'btn-active' : ''}`} onClick={() => handleInput('8')}>8</button>
            <button className={`pill-btn btn-num ${pressedKey === '9' ? 'btn-active' : ''}`} onClick={() => handleInput('9')}>9</button>
            <button 
              className={`pill-btn btn-operator ${pressedKey === '×' ? 'btn-active' : ''}`}
              onClick={() => handleInput('×')}
            >
              <Times size={20} />
            </button>

            {/* Row 3: 4, 5, 6, − */}
            <button className={`pill-btn btn-num ${pressedKey === '4' ? 'btn-active' : ''}`} onClick={() => handleInput('4')}>4</button>
            <button className={`pill-btn btn-num ${pressedKey === '5' ? 'btn-active' : ''}`} onClick={() => handleInput('5')}>5</button>
            <button className={`pill-btn btn-num ${pressedKey === '6' ? 'btn-active' : ''}`} onClick={() => handleInput('6')}>6</button>
            <button 
              className={`pill-btn btn-operator ${pressedKey === '−' ? 'btn-active' : ''}`}
              onClick={() => handleInput('−')}
            >
              <Minus size={22} />
            </button>

            {/* Row 4: 1, 2, 3, + */}
            <button className={`pill-btn btn-num ${pressedKey === '1' ? 'btn-active' : ''}`} onClick={() => handleInput('1')}>1</button>
            <button className={`pill-btn btn-num ${pressedKey === '2' ? 'btn-active' : ''}`} onClick={() => handleInput('2')}>2</button>
            <button className={`pill-btn btn-num ${pressedKey === '3' ? 'btn-active' : ''}`} onClick={() => handleInput('3')}>3</button>
            <button 
              className={`pill-btn btn-operator ${pressedKey === '+' ? 'btn-active' : ''}`}
              onClick={() => handleInput('+')}
            >
              <Plus size={22} />
            </button>

            {/* Row 5: +/-, 0, ., = */}
            <button className={`pill-btn btn-secondary ${pressedKey === '+/-' ? 'btn-active' : ''}`} onClick={() => handleInput('+/-')}>
              ±
            </button>
            <button className={`pill-btn btn-num ${pressedKey === '0' ? 'btn-active' : ''}`} onClick={() => handleInput('0')}>0</button>
            <button className={`pill-btn btn-num ${pressedKey === '.' ? 'btn-active' : ''}`} onClick={() => handleInput('.')}>.</button>
            <button 
              className={`pill-btn btn-mint ${pressedKey === '=' ? 'btn-active' : ''}`}
              onClick={() => handleInput('=')}
            >
              <Equal size={24} />
            </button>
          </div>
        </div>

        {/* Footer Brand Ticker */}
        <footer className="genz-card-footer">
          <span className="footer-vibe">keyboard supported • click & ripple tactile engine</span>
        </footer>
      </div>

      {/* Slide-in Modular Side Panel (Tablet & Desktop Drawer for History & Converter) */}
      {isSidePanelOpen && (
        <>
          <div 
            className="genz-side-backdrop" 
            onClick={() => setIsSidePanelOpen(false)}
            aria-label="Close drawer"
          />
          <aside className="genz-side-panel">
            <div className="mobile-sheet-pill-handle" aria-hidden="true" />
            <div className="side-panel-header">
            <div className="panel-tab-pills">
              <button 
                className={`panel-tab ${sidePanelTab === 'history' ? 'active' : ''}`}
                onClick={() => setSidePanelTab('history')}
              >
                <History size={14} />
                <span>History Tape</span>
              </button>
              <button 
                className={`panel-tab ${sidePanelTab === 'converter' ? 'active' : ''}`}
                onClick={() => setSidePanelTab('converter')}
              >
                <ArrowLeftRight size={14} />
                <span>Quick Convert</span>
              </button>
            </div>
            <button className="panel-close-btn" onClick={() => setIsSidePanelOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="side-panel-body">
            {/* History Tab */}
            {sidePanelTab === 'history' && (
              <div className="history-tape-container">
                <div className="tape-controls-row">
                  <span className="tape-count">{history.length} calculations</span>
                  {history.length > 0 && (
                    <button className="tape-clear-btn" onClick={() => setHistory([])}>
                      clear all
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="tape-empty-state">
                    <Sparkles size={24} color="#B19CD9" />
                    <span>no history yet bb ✨</span>
                    <p>crunch some numbers to populate your tape</p>
                  </div>
                ) : (
                  <div className="tape-items-list">
                    {history.map(item => (
                      <div 
                        key={item.id} 
                        className="tape-item-card"
                        onClick={() => recallHistory(item)}
                      >
                        <div className="tape-item-top">
                          <span className="tape-expr">{item.expression}</span>
                          {item.tag && <span className="tape-tag">{item.tag}</span>}
                        </div>
                        <div className="tape-item-bottom">
                          <span className="tape-res">= {item.result}</span>
                          <span className="tape-time">{item.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Converter Tab */}
            {sidePanelTab === 'converter' && (
              <div className="converter-panel-container">
                <div className="converter-cat-chips">
                  <button 
                    className={`cat-chip ${convertCat === 'currency' ? 'active' : ''}`}
                    onClick={() => { setConvertCat('currency'); setConvertFrom('USD'); setConvertTo('EUR'); }}
                  >
                    Currency
                  </button>
                  <button 
                    className={`cat-chip ${convertCat === 'temp' ? 'active' : ''}`}
                    onClick={() => { setConvertCat('temp'); setConvertFrom('C'); setConvertTo('F'); }}
                  >
                    Temp
                  </button>
                  <button 
                    className={`cat-chip ${convertCat === 'length' ? 'active' : ''}`}
                    onClick={() => { setConvertCat('length'); setConvertFrom('m'); setConvertTo('ft'); }}
                  >
                    Distance
                  </button>
                </div>

                <div className="convert-input-group">
                  <label className="convert-label">Amount</label>
                  <input 
                    type="number" 
                    value={convertVal} 
                    onChange={(e) => setConvertVal(parseFloat(e.target.value) || 0)}
                    className="convert-number-input"
                  />
                </div>

                <div className="convert-units-row">
                  <div className="unit-select-box">
                    <span className="select-label">From</span>
                    {convertCat === 'currency' && (
                      <select value={convertFrom} onChange={(e) => setConvertFrom(e.target.value)} className="convert-select">
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    )}
                    {convertCat === 'temp' && (
                      <select value={convertFrom} onChange={(e) => setConvertFrom(e.target.value)} className="convert-select">
                        <option value="C">°C Celsius</option>
                        <option value="F">°F Fahrenheit</option>
                      </select>
                    )}
                    {convertCat === 'length' && (
                      <select value={convertFrom} onChange={(e) => setConvertFrom(e.target.value)} className="convert-select">
                        <option value="m">Meters (m)</option>
                        <option value="ft">Feet (ft)</option>
                        <option value="km">Kilometers (km)</option>
                        <option value="mi">Miles (mi)</option>
                      </select>
                    )}
                  </div>

                  <button 
                    className="convert-swap-btn"
                    onClick={() => {
                      const temp = convertFrom;
                      setConvertFrom(convertTo);
                      setConvertTo(temp);
                    }}
                    title="Swap Units"
                  >
                    <ArrowLeftRight size={14} />
                  </button>

                  <div className="unit-select-box">
                    <span className="select-label">To</span>
                    {convertCat === 'currency' && (
                      <select value={convertTo} onChange={(e) => setConvertTo(e.target.value)} className="convert-select">
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    )}
                    {convertCat === 'temp' && (
                      <select value={convertTo} onChange={(e) => setConvertTo(e.target.value)} className="convert-select">
                        <option value="F">°F Fahrenheit</option>
                        <option value="C">°C Celsius</option>
                      </select>
                    )}
                    {convertCat === 'length' && (
                      <select value={convertTo} onChange={(e) => setConvertTo(e.target.value)} className="convert-select">
                        <option value="ft">Feet (ft)</option>
                        <option value="m">Meters (m)</option>
                        <option value="mi">Miles (mi)</option>
                        <option value="km">Kilometers (km)</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="convert-result-card">
                  <span className="result-caption">Converted Value</span>
                  <div className="result-val-row">
                    <span className="result-digits">{getConvertedOutput()}</span>
                    <span className="result-unit">{convertTo}</span>
                  </div>
                  <button 
                    className="convert-insert-btn"
                    onClick={() => {
                      const out = getConvertedOutput();
                      setDisplay(out);
                      showToast(`inserted ${out} into calc ✨`);
                      setIsSidePanelOpen(false);
                    }}
                  >
                    Use in Calculator
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </>
    )}
    </div>
  );
};
