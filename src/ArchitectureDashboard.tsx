import React from 'react';
import { ArrowRight, ArrowDown, ArrowLeft, BrainCircuit } from 'lucide-react';

export const ArchitectureDashboard: React.FC = () => {
  return (
    <div className="arch-dashboard image-mode">
      <div className="arch-header">
        <h2 className="arch-title">Invoice Automation Pipeline</h2>
      </div>

      <div className="arch-canvas-image">
        <div className="snake-grid">
          
          {/* ROW 1 */}
          <div className="grid-cell cell-1">
            <div className="flow-node">
              <div className="node-icon-bg" style={{ borderColor: '#EA4335' }}>
                <img src="https://cdn.simpleicons.org/gmail/EA4335" alt="Gmail" width={24} height={24} />
              </div>
              <span className="node-label">Gmail</span>
            </div>
          </div>
          
          <div className="grid-arrow arrow-r1"><ArrowRight className="arrow-icon" size={24} /></div>

          <div className="grid-cell cell-2">
            <div className="flow-node">
              <div className="node-icon-bg" style={{ borderColor: '#1FA463' }}>
                <img src="https://cdn.simpleicons.org/googledrive/1FA463" alt="Drive" width={24} height={24} />
              </div>
              <span className="node-label">Google Drive</span>
            </div>
          </div>

          <div className="grid-arrow arrow-r2"><ArrowRight className="arrow-icon" size={24} /></div>

          <div className="grid-cell cell-3">
            <div className="flow-node">
              <div className="node-icon-bg" style={{ borderColor: '#FF6E6E' }}>
                <img src="https://cdn.simpleicons.org/n8n/FF6E6E" alt="n8n" width={24} height={24} />
              </div>
              <span className="node-label">n8n</span>
            </div>
          </div>

          <div className="grid-arrow arrow-r3"><ArrowRight className="arrow-icon" size={24} /></div>

          <div className="grid-cell cell-4">
            <div className="flow-node">
              <div className="node-icon-bg" style={{ borderColor: '#a855f7' }}>
                <BrainCircuit size={24} color="#a855f7" />
              </div>
              <span className="node-label">Unstract</span>
            </div>
          </div>

          {/* DOWN ARROW */}
          <div className="grid-arrow arrow-down">
            <ArrowDown className="arrow-icon" size={24} />
          </div>

          {/* ROW 2 (Right to Left) */}
          <div className="grid-cell cell-5">
            <div className="flow-node">
              <div className="node-icon-bg" style={{ borderColor: '#009688' }}>
                <img src="https://cdn.simpleicons.org/fastapi/009688" alt="FastAPI" width={24} height={24} />
              </div>
              <span className="node-label">FastAPI</span>
            </div>
          </div>

          <div className="grid-arrow arrow-l1"><ArrowLeft className="arrow-icon" size={24} /></div>

          <div className="grid-cell cell-6">
            <div className="flow-node">
              <div className="node-icon-bg" style={{ borderColor: '#47A248' }}>
                <img src="https://cdn.simpleicons.org/mongodb/47A248" alt="MongoDB" width={24} height={24} />
              </div>
              <span className="node-label">MongoDB</span>
            </div>
          </div>

          <div className="grid-arrow arrow-l2"><ArrowLeft className="arrow-icon" size={24} /></div>

          <div className="grid-cell cell-7">
            <div className="flow-node">
              <div className="node-icon-bg" style={{ borderColor: '#61DAFB' }}>
                <img src="https://cdn.simpleicons.org/react/61DAFB" alt="React" width={24} height={24} />
              </div>
              <span className="node-label">React SPA</span>
            </div>
          </div>

          <div className="grid-arrow arrow-l3"><ArrowLeft className="arrow-icon" size={24} /></div>

          <div className="grid-cell cell-8">
            <div className="flow-node">
              <div className="node-icon-bg" style={{ borderColor: '#E3222B' }}>
                <img src="https://cdn.simpleicons.org/zoho/E3222B" alt="Zoho" width={24} height={24} />
              </div>
              <span className="node-label">Zoho Books</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
