import { useState } from 'react';
import './App.css';
import { Sparkles, Pencil, ArrowLeftRight, Layers } from 'lucide-react';
import { AppleMathNotes } from './components/AppleMathNotes';
import UnitConverter from './components/UnitConverter';
import { GenZCalculator } from './components/GenZCalculator';

type Mode = 'aura' | 'notes' | 'converter';

function App() {
  const [mode, setMode] = useState<Mode>('aura');
  const [showFloatMenu, setShowFloatMenu] = useState(false);

  return (
    <div className="aura-app-root">
      {/* Ambient Cybernetic Header */}
      <header className="aura-nav-header">
        <div className="aura-brand">
          <div className="aura-logo-badge">
            <Sparkles size={18} className="aura-spark-icon" />
          </div>
          <div className="aura-title-group">
            <span className="aura-title">
              AURA <span className="aura-title-gradient">STUDIO</span>
            </span>
            <span className="aura-tagline">CYBERNETIC MATH & LOGIC</span>
          </div>
        </div>

        {/* Mobile / Desktop Status Badge */}
        <div className="aura-header-status-pill">
          <span className="aura-status-dot" />
          <span className="aura-status-text">CYBER v2.0</span>
        </div>

        {/* Futuristic Glassmorphic Navigation Tabs */}
        <nav className="aura-tabs">
          <button 
            className={`aura-tab ${mode === 'aura' ? 'active calc' : ''}`}
            onClick={() => setMode('aura')}
            title="Aura Calc - Tactile Gen Z Calculator"
          >
            <Sparkles size={15} />
            <span>Aura Calc</span>
          </button>

          <button 
            className={`aura-tab ${mode === 'notes' ? 'active notes' : ''}`}
            onClick={() => setMode('notes')}
            title="Cyber Notes - Holographic Math Pad & Stylus"
          >
            <Pencil size={15} />
            <span>Cyber Notes</span>
          </button>
          
          <button 
            className={`aura-tab ${mode === 'converter' ? 'active conv' : ''}`}
            onClick={() => setMode('converter')}
            title="Flux Converter - Precision Unit & Currency Engine"
          >
            <ArrowLeftRight size={15} />
            <span>Flux Converter</span>
          </button>
        </nav>
      </header>

      {/* Main Surface Viewport */}
      <main className="aura-main-content">
        <div className={`aura-card-wrapper ${mode}`}>
          {mode === 'aura' && <GenZCalculator />}
          {mode === 'notes' && <AppleMathNotes />}
          {mode === 'converter' && <UnitConverter />}
        </div>
      </main>

      {/* Floating Futuristic Mode Switcher */}
      <div className="aura-float-switcher-wrapper">
        <button 
          className={`aura-float-switcher-btn ${showFloatMenu ? 'open' : ''}`}
          onClick={() => setShowFloatMenu(!showFloatMenu)}
          title="Quick Switch Modes"
        >
          <Layers size={20} />
        </button>

        {showFloatMenu && (
          <div className="aura-float-popover">
            <div className="popover-title">WORKSPACES</div>
            <button 
              className={`popover-item ${mode === 'aura' ? 'active' : ''}`}
              onClick={() => { setMode('aura'); setShowFloatMenu(false); }}
            >
              <div className="popover-icon-box calc">
                <Sparkles size={16} />
              </div>
              <div className="item-text">
                <span className="name">Aura Calc</span>
                <span className="desc">Tactile pill keys, live preview & haptic pop</span>
              </div>
            </button>

            <button 
              className={`popover-item ${mode === 'notes' ? 'active' : ''}`}
              onClick={() => { setMode('notes'); setShowFloatMenu(false); }}
            >
              <div className="popover-icon-box notes">
                <Pencil size={16} />
              </div>
              <div className="item-text">
                <span className="name">Cyber Notes</span>
                <span className="desc">Holographic ink, value scrubbers & graphs</span>
              </div>
            </button>

            <button 
              className={`popover-item ${mode === 'converter' ? 'active' : ''}`}
              onClick={() => { setMode('converter'); setShowFloatMenu(false); }}
            >
              <div className="popover-icon-box conv">
                <ArrowLeftRight size={16} />
              </div>
              <div className="item-text">
                <span className="name">Flux Converter</span>
                <span className="desc">Precision multi-unit & currency engine</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Futuristic Ambient Footer */}
      <footer className="aura-footer">
        <div className="aura-footer-content">
          <span className="footer-status-dot" />
          <span>AURA COMPUTATIONAL SUITE • REACTIVE DAG • HOLOGRAPHIC ENGINE</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
