import { Activity, Server, AlertCircle, CheckCircle2, TrendingUp, BarChart3, FileText, CloudLightning } from 'lucide-react';
import './index.css';

export function SystemHealthDashboard() {
  return (
    <div className="dashboard-mockup">
      <div className="dashboard-header border-b">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-secondary" />
          <h4 className="font-semibold m-0 text-sm">System Health Monitor</h4>
        </div>
        <div className="status-badge bg-green-100 text-green-700">
          <span className="status-dot bg-green-500"></span>
          Operational
        </div>
      </div>
      
      <div className="dashboard-grid">
        <div className="stat-box">
          <div className="stat-box-header">API Uptime</div>
          <div className="stat-box-value text-green-600">99.98%</div>
          <div className="stat-box-trend"><Activity size={14}/> 30 days</div>
        </div>
        
        <div className="stat-box">
          <div className="stat-box-header">Error Rate</div>
          <div className="stat-box-value">0.02%</div>
          <div className="stat-box-trend text-red-500"><TrendingUp size={14}/> +0.01% vs yesterday</div>
        </div>

        <div className="stat-box">
          <div className="stat-box-header">Retry Queue</div>
          <div className="stat-box-value">4</div>
          <div className="stat-box-trend text-amber-500"><AlertCircle size={14}/> 2 failed syncs</div>
        </div>
      </div>

      <div className="dashboard-section">
        <h5 className="section-title">Live System Audit Trail</h5>
        <div className="audit-log">
          <div className="log-entry">
            <span className="log-time">14:02:11</span>
            <span className="log-level info">INFO</span>
            <span className="log-msg">Invoice INV-2026-89 synced to Zoho Books successfully</span>
          </div>
          <div className="log-entry">
            <span className="log-time">14:01:45</span>
            <span className="log-level info">INFO</span>
            <span className="log-msg">Extraction complete for PDF attachment: aws_billing_june.pdf</span>
          </div>
          <div className="log-entry">
            <span className="log-time">14:01:40</span>
            <span className="log-level warn">WARN</span>
            <span className="log-msg">GSTIN mismatch for vendor "Razorpay". Quarantined for review.</span>
          </div>
          <div className="log-entry">
            <span className="log-time">14:01:05</span>
            <span className="log-level error">ERROR</span>
            <span className="log-msg">Zoho API connection timeout. Added to retry queue (Attempt 1/3)</span>
          </div>
          <div className="log-entry">
            <span className="log-time">14:00:12</span>
            <span className="log-level info">INFO</span>
            <span className="log-msg">New email received from billing@aws.amazon.com. Triggering n8n workflow.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinanceUsageDashboard() {
  return (
    <div className="dashboard-mockup">
      <div className="dashboard-header border-b">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-secondary" />
          <h4 className="font-semibold m-0 text-sm">Finance Usage & Accuracy</h4>
        </div>
        <div className="text-xs text-secondary">June 2026</div>
      </div>
      
      <div className="dashboard-grid three-cols">
        <div className="stat-box">
          <div className="stat-box-header">Received by Mail</div>
          <div className="stat-box-value">115</div>
          <div className="stat-box-trend"><FileText size={14}/> Total inbox items</div>
        </div>
        
        <div className="stat-box">
          <div className="stat-box-header">Total Processed</div>
          <div className="stat-box-value">101</div>
          <div className="stat-box-trend text-blue-600"><CheckCircle2 size={14}/> Valid invoices</div>
        </div>

        <div className="stat-box">
          <div className="stat-box-header">Pushed to Zoho</div>
          <div className="stat-box-value">27</div>
          <div className="stat-box-trend text-green-600"><CloudLightning size={14}/> Synced to books</div>
        </div>
      </div>

      <div className="dashboard-split">
        <div className="dashboard-section split-left">
          <h5 className="section-title">Invoice Processing Status</h5>
          <div className="status-bars">
            <div className="status-row">
              <div className="status-label">Accepted</div>
              <div className="status-track"><div className="status-fill bg-green-500" style={{width: '65%'}}></div></div>
              <div className="status-num">65</div>
            </div>
            <div className="status-row">
              <div className="status-label">Edited</div>
              <div className="status-track"><div className="status-fill bg-amber-500" style={{width: '18%'}}></div></div>
              <div className="status-num">18</div>
            </div>
            <div className="status-row">
              <div className="status-label">Pending</div>
              <div className="status-track"><div className="status-fill bg-blue-500" style={{width: '12%'}}></div></div>
              <div className="status-num">12</div>
            </div>
            <div className="status-row">
              <div className="status-label">Rejected</div>
              <div className="status-track"><div className="status-fill bg-red-500" style={{width: '6%'}}></div></div>
              <div className="status-num">6</div>
            </div>
          </div>
        </div>

        <div className="dashboard-section split-right border-l">
          <h5 className="section-title">Top Vendors by Volume</h5>
          <ul className="vendor-list">
            <li>
              <span className="vendor-name">AWS India Pvt Ltd</span>
              <span className="vendor-vol">24</span>
            </li>
            <li>
              <span className="vendor-name">WeWork</span>
              <span className="vendor-vol">18</span>
            </li>
            <li>
              <span className="vendor-name">Google Workspace</span>
              <span className="vendor-vol">12</span>
            </li>
            <li>
              <span className="vendor-name">Razorpay Software</span>
              <span className="vendor-vol">9</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
