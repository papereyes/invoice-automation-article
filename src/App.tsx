import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ArticleContent } from './ArticleContent';
import './index.css';

const tocItems = [
  { id: 'manual-invoice-processing-breaks-at-scale', text: 'Manual Invoice Processing Breaks at Scale' },
  { id: 'the-approach-ai-for-extraction-rules-for-judgement-humans-for-exceptions', text: 'The Approach: AI for Extraction' },
  { id: 'system-architecture', text: 'System Architecture' },
  { id: 'non-functional-requirements', text: 'Non-Functional Requirements' },
  { id: 'how-we-faced-undocumented-api-endpoints', text: 'Undocumented API Endpoints' },
  { id: 'lived-experience-failures', text: 'Failures and Corrections' },
  { id: 'edge-cases', text: 'Edge Cases' },
  { id: 'outcomes', text: 'Outcomes' },
  { id: 'what-we-learned', text: 'What We Learned' },
  { id: 'where-things-stand', text: 'Where Things Stand' }
];

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="medium-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h3>Table of Contents</h3>
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        
        <ul className="toc-list">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.text}</a>
            </li>
          ))}
        </ul>
      </nav>
      
      <main className="content-area">
        <article className="markdown-container">
          <ArticleContent />
        </article>
      </main>
    </div>
  );
}

export default App;
