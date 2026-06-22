import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ArticleContent } from './ArticleContent';
import './index.css';

const tocItems = [
  { id: 'building-the-ai-powered-accounts-payable-automation-system', text: 'Building the System' },
  { id: 'when-invoice-volume-grows-faster', text: 'When Invoice Volume Grows' },
  { id: 'extraction-by-ai', text: 'Extraction by AI, Logic by Rules' },
  { id: 'system-architecture', text: 'System Architecture' },
  { id: 'infrastructure-that-holds', text: 'Non-Functional Requirements' },
  { id: 'outcomes', text: 'Outcomes' },
  { id: 'challenges-encountered', text: 'Challenges Encountered' },
  { id: 'exceptions', text: 'Exceptions the Platform Accounts For' },
  { id: 'principles', text: 'Principles That Guided the Build' },
  { id: 'where-this-leads', text: 'Where This Leads' }
];

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -40; 
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
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
              <a href={`#${item.id}`} onClick={(e) => scrollToSection(e, item.id)}>{item.text}</a>
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
