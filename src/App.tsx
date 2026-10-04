import { useState } from 'react';
import './App.css';
import { Calculator as CalcIcon, Pencil, ArrowLeftRight } from 'lucide-react';
import BasicCalculator from './components/BasicCalculator';
import MathNotes from './components/MathNotes';
import UnitConverter from './components/UnitConverter';

type Mode = 'calculator' | 'converter' | 'notes';

function App() {
  const [mode, setMode] = useState<Mode>('calculator');

  return (
    <div className="google-app-root">
      {/* Top Google Header */}
      <header className="google-nav-header">
        <div className="google-brand">
          <svg className="google-g-icon" viewBox="0 0 24 24" width="22" height="22">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.36 7.34 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"/>
          </svg>
          <span className="google-title">Google Calculator</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="google-tabs">
          <button 
            className={`google-tab ${mode === 'calculator' ? 'active' : ''}`}
            onClick={() => setMode('calculator')}
          >
            <CalcIcon size={16} />
            <span>Calculator</span>
          </button>
          
          <button 
            className={`google-tab ${mode === 'converter' ? 'active' : ''}`}
            onClick={() => setMode('converter')}
          >
            <ArrowLeftRight size={16} />
            <span>Converter</span>
          </button>

          <button 
            className={`google-tab ${mode === 'notes' ? 'active' : ''}`}
            onClick={() => setMode('notes')}
          >
            <Pencil size={16} />
            <span>Math Notes</span>
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="google-main-content">
        <div className={`google-card-wrapper ${mode}`}>
          {mode === 'calculator' && <BasicCalculator />}
          {mode === 'converter' && <UnitConverter />}
          {mode === 'notes' && <MathNotes />}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="google-footer">
        <span>Powered by Google Dark Theme & Gemini Math Engine</span>
      </footer>
    </div>
  );
}

export default App;
