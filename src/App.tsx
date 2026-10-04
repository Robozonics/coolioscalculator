import { useState } from 'react';
import './App.css';
import { Calculator as CalcIcon, Pencil, ArrowLeftRight } from 'lucide-react';
import BasicCalculator from './components/BasicCalculator';
import MathNotes from './components/MathNotes';
import UnitConverter from './components/UnitConverter';

type Mode = 'basic' | 'scientific' | 'notes' | 'converter';

function App() {
  const [mode, setMode] = useState<Mode>('basic');

  return (
    <>
      <div className="app-background"></div>
      <div className="app-wrapper">
        <div className={`glass-panel ${mode === 'scientific' ? 'scientific-open' : ''} ${mode === 'notes' ? 'notes-open' : ''}`}>
          
          <div className="toolbar">
            <div className="mode-switcher">
              <button 
                className={`mode-tab ${mode === 'basic' || mode === 'scientific' ? 'active' : ''}`}
                onClick={() => setMode('basic')}
              >
                <CalcIcon size={18} /> Basic
              </button>
              <button 
                className={`mode-tab ${mode === 'converter' ? 'active' : ''}`}
                onClick={() => setMode('converter')}
              >
                <ArrowLeftRight size={18} /> Convert
              </button>
              <button 
                className={`mode-tab ${mode === 'notes' ? 'active' : ''}`}
                onClick={() => setMode('notes')}
              >
                <Pencil size={18} /> Notes
              </button>
            </div>
          </div>

          <div className="calc-content">
            {mode === 'basic' || mode === 'scientific' ? (
              <BasicCalculator 
                isScientific={mode === 'scientific'} 
                onToggleScientific={() => setMode(mode === 'basic' ? 'scientific' : 'basic')}
              />
            ) : mode === 'converter' ? (
              <UnitConverter />
            ) : (
              <MathNotes />
            )}
          </div>
          
        </div>
      </div>
    </>
  );
}

export default App;
