import { useState } from 'react';
import './App.css';
import { Menu, Calculator as CalcIcon, Pencil, ArrowLeftRight } from 'lucide-react';
import BasicCalculator from './components/BasicCalculator';
import MathNotes from './components/MathNotes';
import UnitConverter from './components/UnitConverter';

type Mode = 'basic' | 'scientific' | 'notes' | 'converter';

interface HistoryEntry {
  expression: string;
  result: string;
}

function App() {
  const [mode, setMode] = useState<Mode>('basic');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const addHistory = (expr: string, res: string) => {
    setHistory([{ expression: expr, result: res }, ...history]);
  };

  return (
    <div className="app-container">
      {/* Sidebar History */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">History Tape</div>
        <div className="history-list">
          {history.length === 0 ? (
            <div style={{ padding: 20, color: '#8e8e93', textAlign: 'center' }}>No History</div>
          ) : (
            history.map((h, i) => (
              <div key={i} className="history-item">
                <div className="history-expr">{h.expression}</div>
                <div className="history-res">{h.result}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`main-content ${sidebarOpen ? 'shifted' : ''}`}>
        {/* Toolbar */}
        <div className="toolbar">
          <button className="icon-btn" onClick={toggleSidebar}>
            <Menu size={28} />
          </button>
          
          <div className="mode-selector">
            <button 
              className={`mode-btn ${mode === 'basic' || mode === 'scientific' ? 'active' : ''}`}
              onClick={() => setMode('basic')}
            >
              <CalcIcon size={18} />
            </button>
            <button 
              className={`mode-btn ${mode === 'converter' ? 'active' : ''}`}
              onClick={() => setMode('converter')}
            >
              <ArrowLeftRight size={18} />
            </button>
            <button 
              className={`mode-btn ${mode === 'notes' ? 'active' : ''}`}
              onClick={() => setMode('notes')}
            >
              <Pencil size={18} />
            </button>
          </div>
          
          <div style={{ width: 44 }}></div> {/* Spacer for symmetry */}
        </div>

        {/* Dynamic View based on Mode */}
        {mode === 'basic' || mode === 'scientific' ? (
          <BasicCalculator 
            isScientific={mode === 'scientific'} 
            onToggleScientific={() => setMode(mode === 'basic' ? 'scientific' : 'basic')}
            onSaveHistory={addHistory}
          />
        ) : mode === 'converter' ? (
          <UnitConverter />
        ) : (
          <MathNotes />
        )}
      </div>
    </div>
  );
}

export default App;
