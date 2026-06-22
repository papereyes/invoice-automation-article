import { motion, useScroll, useSpring } from 'framer-motion';
import { Database, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import articleContent from '../CodeWalnut_Invoice_Automation_Article.md?raw';
import './index.css';

const MarkdownComponents: any = {
  blockquote: ({ node, children, ...props }: any) => {
    // Convert React node to string for simple parsing
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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="interactive-diagram"
        >
          <div className="diagram-header">
            <Database className="diagram-icon" size={24} />
            <h3>System Architecture</h3>
          </div>
          <img src="/Invoice System Architecture.png" alt="Architecture Diagram" className="diagram-image" />
          <p className="diagram-caption">Five-layer system: n8n (ingestion) → FastAPI (application) → MongoDB (database) → React SPA (presentation) → Zoho Books (accounting)</p>
        </motion.div>
      );
    }
    
    if (fullText.includes('[Observability Dashboard Diagram — insert here]')) {
      return (
         <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="interactive-diagram"
        >
          <div className="diagram-header">
            <Activity className="diagram-icon" size={24} />
            <h3>Observability Metrics</h3>
          </div>
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
          <p className="diagram-caption">Audit trail, invoice received / processed / pushed to Zoho, accepted / rejected / pending counts, line chart of invoice volume over time</p>
        </motion.div>
      );
    }

    return <blockquote {...props}>{children}</blockquote>;
  }
};

function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="app-container">
      <div className="progress-bar-container">
        <motion.div className="progress-bar" style={{ scaleX }} />
      </div>

      <header className="hero-section">
        <div className="hero-glow" />
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="hero-badge">Engineering Success Story</span>
          <h1 className="hero-title">How We Automated Vendor Invoice Processing</h1>
          <p className="hero-subtitle">
            Three months of building, breaking, and fixing an AI-assisted invoice platform. 
            Here is what the architecture looks like, what went wrong, and what we learned from it.
          </p>
        </motion.div>
      </header>

      <main className="content-section">
        <motion.div 
          className="markdown-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {articleContent}
          </ReactMarkdown>
        </motion.div>
      </main>

      <footer className="site-footer">
        <p>CodeWalnut Engineering · June 2026</p>
      </footer>
    </div>
  );
}

export default App;
