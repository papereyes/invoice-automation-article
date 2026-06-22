import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sun, Moon } from 'lucide-react';
import articleContent from '../CodeWalnut_Invoice_Automation_Article.md?raw';
import { ArchitectureDashboard } from './ArchitectureDashboard';
import './index.css';

// Custom ID generation for headers
const generateId = (text: string) => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const MarkdownComponents: any = {
  h2: ({ children }: any) => {
    const text = children[0];
    const id = generateId(text);
    return <h2 id={id}>{children}</h2>;
  },
  blockquote: ({ node, children, ...props }: any) => {
    const getChildrenText = (nodes: any): string => {
      if (!nodes) return '';
      if (typeof nodes === 'string') return nodes;
      if (Array.isArray(nodes)) return nodes.map(getChildrenText).join('');
      if (nodes.props && nodes.props.children) return getChildrenText(nodes.props.children);
      return '';
    };

    const fullText = getChildrenText(children);

    if (fullText.includes('[Architecture Diagram — insert here]')) {
      return (
        <div className="diagram-section">
          <div className="diagram-container">
            <div className="diagram-header">
              <h3>System Architecture</h3>
            </div>
            <img src="/Invoice System Architecture.png" alt="Architecture Diagram" className="diagram-image" />
            <p className="diagram-caption">Five-layer system: n8n (ingestion) → FastAPI (application) → MongoDB (database) → React SPA (presentation) → Zoho Books (accounting)</p>
          </div>
          
          <div className="diagram-container" style={{ marginTop: '3rem' }}>
            <ArchitectureDashboard />
          </div>
        </div>
      );
    }
    
    if (fullText.includes('[Observability Dashboard Diagram — insert here]')) {
      return (
         <div className="diagram-container">
          <div className="mock-dashboard">
             <div className="stat-card">
               <span className="stat-value">95%</span>
               <span className="stat-label">Automation Rate</span>
             </div>
             <div className="stat-card">
               <span className="stat-value">&lt; 30s</span>
               <span className="stat-label">Processing Time</span>
             </div>
             <div className="stat-card">
               <span className="stat-value">0.01%</span>
               <span className="stat-label">Error Rate</span>
             </div>
          </div>
        </div>
      );
    }

    return <blockquote {...props}>{children}</blockquote>;
  }
};

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Extract H2s for TOC
  const headings = articleContent
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.replace('## ', '').trim());

  return (
    <div className="medium-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h3>Table of Contents</h3>
          <button 
            className="theme-toggle" 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        <ul className="toc-list">
          {headings.map((heading, idx) => (
            <li key={idx}>
              <a href={`#${generateId(heading)}`}>{heading}</a>
            </li>
          ))}
        </ul>
      </nav>

      <main className="content-area">
        <article className="markdown-container">
          <header className="article-header">
            <h1>How We Automated Vendor Invoice Processing</h1>
            <p className="article-subtitle">Three months of building, breaking, and fixing an AI-assisted invoice platform.</p>
            <div className="article-meta">
              <span>CodeWalnut Engineering</span>
              <span>·</span>
              <span>June 2026</span>
            </div>
          </header>

          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {articleContent}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}

export default App;
