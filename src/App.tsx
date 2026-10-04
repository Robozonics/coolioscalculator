import { useState } from 'react';
import './App.css';
import { Calculator as CalcIcon, Pencil, ArrowLeftRight, Sparkles } from 'lucide-react';
import BasicCalculator from './components/BasicCalculator';
import { AppleMathNotes } from './components/AppleMathNotes';
import UnitConverter from './components/UnitConverter';
import { GenZCalculator } from './components/GenZCalculator';

type Mode = 'genz' | 'notes' | 'calculator' | 'converter';

function App() {
  const [mode, setMode] = useState<Mode>('genz'); // Default to Ultra-Modern Gen Z Aesthetic Calculator
  const [showFloatMenu, setShowFloatMenu] = useState(false);

  return (
    <div className="google-app-root">
      {/* Top Header */}
      <header className="google-nav-header">
        <div className="google-brand">
          <svg className="google-g-icon" viewBox="0 0 24 24" width="22" height="22">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.36 7.34 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"/>
          </svg>
          <span className="google-title">Math Notes & Calculator</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="google-tabs">
          <button 
            className={`google-tab ${mode === 'genz' ? 'active' : ''}`}
            onClick={() => setMode('genz')}
            title="Gen Z Ultra-Modern Aesthetic Calculator"
          >
            <Sparkles size={16} color={mode === 'genz' ? '#B19CD9' : '#8e8e93'} />
            <span>Aura (Gen Z)</span>
          </button>

          <button 
            className={`google-tab ${mode === 'notes' ? 'active' : ''}`}
            onClick={() => setMode('notes')}
          >
            <Pencil size={16} />
            <span>Math Notes (iPadOS)</span>
          </button>

          <button 
            className={`google-tab ${mode === 'calculator' ? 'active' : ''}`}
            onClick={() => setMode('calculator')}
          >
            <CalcIcon size={16} />
            <span>Google Calculator</span>
          </button>
          
          <button 
            className={`google-tab ${mode === 'converter' ? 'active' : ''}`}
            onClick={() => setMode('converter')}
          >
            <ArrowLeftRight size={16} />
            <span>Converter</span>
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="google-main-content">
        <div className={`google-card-wrapper ${mode}`}>
          {mode === 'genz' && <GenZCalculator />}
          {mode === 'notes' && <AppleMathNotes />}
          {mode === 'calculator' && <BasicCalculator />}
          {mode === 'converter' && <UnitConverter />}
        </div>
      </main>

      {/* iPadOS Signature Floating Mode Switcher Button (As seen in tutorial video) */}
      <div className="ipados-float-switcher-wrapper">
        <button 
          className={`ipados-float-switcher-btn ${showFloatMenu ? 'open' : ''}`}
          onClick={() => setShowFloatMenu(!showFloatMenu)}
          title="iPadOS Calculator Switcher Menu"
        >
          <CalcIcon size={20} />
        </button>

        {showFloatMenu && (
          <div className="ipados-float-popover">
            <div className="popover-title">Calculator Modes</div>
            <button 
              className={`popover-item ${mode === 'genz' ? 'active' : ''}`}
              onClick={() => { setMode('genz'); setShowFloatMenu(false); }}
            >
              <Sparkles size={15} color="#B19CD9" />
              <div className="item-text">
                <span className="name">Aura (Gen Z)</span>
                <span className="desc">Glassmorphic neon-pastel aesthetic</span>
              </div>
            </button>
            <button 
              className={`popover-item ${mode === 'notes' ? 'active' : ''}`}
              onClick={() => { setMode('notes'); setShowFloatMenu(false); }}
            >
              <Pencil size={15} color="#ff9f0a" />
              <div className="item-text">
                <span className="name">Math Notes</span>
                <span className="desc">Handwriting, variables, & graphs</span>
              </div>
            </button>
            <button 
              className={`popover-item ${mode === 'calculator' ? 'active' : ''}`}
              onClick={() => { setMode('calculator'); setShowFloatMenu(false); }}
            >
              <CalcIcon size={15} color="#4285F4" />
              <div className="item-text">
                <span className="name">Google Calculator</span>
                <span className="desc">Scientific & basic keys</span>
              </div>
            </button>
            <button 
              className={`popover-item ${mode === 'converter' ? 'active' : ''}`}
              onClick={() => { setMode('converter'); setShowFloatMenu(false); }}
            >
              <ArrowLeftRight size={15} color="#34A853" />
              <div className="item-text">
                <span className="name">Unit Converter</span>
                <span className="desc">Length, temperature, mass</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="google-footer">
        <span>Stateful Multi-Modal Math Engine • Reactive DAG • 2D/3D Graphs</span>
      </footer>
    </div>
  );
}

export default App;
