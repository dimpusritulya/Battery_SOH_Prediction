import { useState, useEffect } from 'react';
import SinglePredict   from './components/SinglePredict';
import DegradationSim  from './components/DegradationSim';
import BatchPredict    from './components/BatchPredict';
import ModelInfo       from './components/ModelInfo';
import './index.css';

const API = 'http://localhost:5001/api';

const TABS = [
  { id: 'predict',  label: 'Live Predict',  icon: '⚡' },
  { id: 'simulate', label: 'Degradation',   icon: '📉' },
  { id: 'batch',    label: 'Batch',         icon: '📋' },
  { id: 'model',    label: 'Model Info',    icon: '🧠' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('predict');
  const [apiOnline, setApiOnline] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
        setApiOnline(res.ok);
      } catch {
        setApiOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-icon">🔋</div>
          <div>
            <div className="header-title">
              Battery <span>SOH Predictor</span>
            </div>
            <div className="header-subtitle">
              SVR Model · NASA Battery Aging Dataset · R² = 93.1%
            </div>
          </div>
        </div>

        <div
          className={`status-pill ${apiOnline === true ? 'online' : apiOnline === false ? 'offline' : 'offline'}`}
          title={`Flask API: ${apiOnline ? 'Running on port 5001' : 'Unreachable'}`}
        >
          <div className="status-dot" />
          {apiOnline === true ? 'API Online' : apiOnline === false ? 'API Offline' : 'Connecting…'}
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav" role="navigation" aria-label="Main navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* API offline banner */}
      {apiOnline === false && (
        <div style={{
          background: 'rgba(255,51,102,0.1)',
          border: '1px solid rgba(255,51,102,0.3)',
          margin: '16px 40px 0',
          padding: '12px 20px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: '#ff3366',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span>⚠</span>
          <span>
            Flask API is not reachable. Start the backend with:
            <code style={{ marginLeft: 8, background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
              python battery_soh_app/backend/app.py
            </code>
          </span>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content" role="main">
        {activeTab === 'predict'  && <SinglePredict  />}
        {activeTab === 'simulate' && <DegradationSim />}
        {activeTab === 'batch'    && <BatchPredict   />}
        {activeTab === 'model'    && <ModelInfo      />}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '20px 40px',
        borderTop: '1px solid var(--clr-border)',
        fontSize: '0.78rem',
        color: 'var(--clr-text-3)',
      }}>
        Battery SOH Predictor · SVR Model (RBF kernel, C=10) · Built with React + Flask
      </footer>
    </>
  );
}
