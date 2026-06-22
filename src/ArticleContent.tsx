import { ArchitectureDashboard } from './ArchitectureDashboard';
import { SystemHealthDashboard, FinanceUsageDashboard } from './ObservabilityDashboards';
import { CostDashboard } from './CostDashboard';

export function ArticleContent() {
  return (
    <div className="markdown-content">
      <h1 id="how-we-automated-vendor-invoice-processing">How We Automated Vendor Invoice Processing at CodeWalnut</h1>
      
      <p><em>Three months of building, breaking, and fixing an AI-assisted invoice platform. Here is what the architecture looks like, what went wrong, and what we learned from it.</em></p>
      
      <hr />
      
      <p>Before we get into the how, here are the three questions every finance manager asks when you pitch automation:</p>
      
      <p><strong>What will it cost?</strong> The platform costs very little to run at any realistic invoice volume. The infrastructure runs on a DigitalOcean VPS at $6 a month. The AI extraction cost, based on our actual usage data, works out to roughly $0.028 per invoice. At 50 invoices a month the total platform cost is around $7.38. At 500 invoices it is around $19.83. At 1,000 invoices it is under $34. There are no per-invoice SaaS fees, no automation middleware subscriptions, and no additional Zoho costs — the team was already on Zoho Books before this project began.</p>

      <CostDashboard />
      
      <p><strong>How secure is our financial data?</strong> Every communication is encrypted in transit. Access is role-based — finance staff see only what their role permits. OAuth tokens rotate automatically on a one-hour cycle. Every invoice has an immutable audit trail from the moment it arrives to the moment it is booked.</p>
      
      <p><strong>How do we know it is working?</strong> Two separate dashboards — one for system health monitored by the support engineer, one for usage and accuracy trends monitored by the finance manager. The numbers are measured in real time, not estimated after the fact.</p>
      
      <p>Those three questions deserve real answers, not reassurances. The rest of this article is those real answers, with the architecture and the failures included.</p>
      
      <hr />
      
      <h2 id="manual-invoice-processing-breaks-at-scale">Manual Invoice Processing Breaks at Scale</h2>
      
      <p>The accounts payable process looks straightforward on paper. A vendor emails a PDF. Someone from finance downloads it, reads it, verifies the vendor details, keys the data into Zoho Books, validates the GST, and creates a bill. Repeatable, simple, manageable.</p>
      
      <p>At 50 invoices a month, it holds. Cross 100, and you feel the strain. At 500 or 1,000 invoices, you have a structural problem that headcount alone cannot fix. Each invoice takes over 10 minutes end-to-end. The work is repetitive and high-stakes, and that combination guarantees mistakes over time.</p>
      
      <p>The process breaks in two specific ways at scale. First, data entry errors accumulate — wrong ledger entries, incorrect values (a ₹20,000 invoice entered as ₹2,000), duplicate registrations when multiple people work the same inbox. Second, invoices pile up and entries get delayed, which means MIS reporting is always working from incomplete or stale data.</p>
      
      <p>These were not theoretical risks for us. In one MIS review, the co-founders caught three or four errors in the total expenditure figures mid-meeting. The finance manager, who was doing diligent work, had to sit through that knowing the root cause was data entry slip-ups he could not fully prevent. He was walking into leadership reviews nervous, not prepared.</p>
      
      <p>The incident that forced the decision: a founder asked to see the supporting invoices for ten specific transactions. The team spent fifteen minutes searching through email threads, inbox folders, and shared drives and still could not locate several of the originals. The reports were not just occasionally wrong. They had become untrustworthy.</p>
      
      <hr />
      
      <h2 id="the-approach-ai-for-extraction-rules-for-judgement-humans-for-exceptions">The Approach: AI for Extraction, Rules for Judgement, Humans for Exceptions</h2>
      
      <p>The solution was not to automate everything. It was to automate the right parts.</p>
      
      <p>Large language models are well-suited to one specific task: reading unstructured documents and extracting structured fields. An invoice is exactly that kind of document, and we leaned into that. But AI extraction alone is not sufficient for financial data. LLMs are probabilistic. They fill in gaps with plausible answers, and in accounting, a plausible wrong answer is worse than no answer.</p>
      
      <p>Our approach was to use AI for extraction, deterministic rules for business logic, and human review for anything the system is not confident about.</p>
      
      <p>Ledger assignment, GSTIN validation, and vendor mapping are handled entirely in rules-based code. The model extracts; the rules decide. For invoices where the system cannot extract a required field cleanly, or where a validation check fails, the invoice goes to a quarantine queue for human review before anything reaches Zoho. This is a designed part of the system, not a workaround.</p>
      
      <p>The result is a platform where the accounting team is not replaced — they are freed from the volume work and focused on the cases that genuinely need their attention.</p>
      
      <hr />
      
      <h2 id="system-architecture">System Architecture</h2>
      
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
      
      <p>The platform is built across five layers, each with a single clear responsibility.</p>
      
      <h3 id="ingestion-layer">Ingestion Layer — n8n on a Self-Hosted VPS</h3>
      
      <p>A Gmail trigger listens for incoming vendor emails. When an email arrives, an extraction node decouples the payload and passes every attachment to Unstract, our OCR engine, which converts the invoice PDF to structured JSON. A custom JavaScript parser then normalises that output before it moves downstream.</p>
      
      <p>Two decisions here that shaped everything else. First, we enumerate all attachments in every email — not just the first one — because vendors sometimes send multiple invoices in a single message and the system needs to handle each one independently. Second, the raw invoice binary is saved to Google Drive before any processing begins. Before Unstract. Before the API. Before Zoho. If everything downstream fails, the original document is safe.</p>
      
      <h3 id="application-layer">Application Layer — FastAPI</h3>
      
      <p>The parsed JSON arrives at our FastAPI service, which handles two distinct responsibilities.</p>
      
      <p><code>token_service.py</code> manages the full OAuth2 lifecycle with Zoho — token rotation, retry logic, and silent re-authentication when a token expires mid-run. This became critical infrastructure, which we will come back to.</p>
      
      <p>The Invoice API Controller runs the business logic: validation against our vendor master, GSTIN-to-vendor mapping, ledger assignment via rules, duplicate detection via idempotency keys, and session management. Critically, nothing in this layer delegates business decisions to the LLM. One GSTIN maps to exactly one vendor. If that mapping fails, the invoice is quarantined.</p>
      
      <h3 id="database-layer">Database Layer — MongoDB</h3>
      
      <p>MongoDB serves as a persistent buffer between our application layer and Zoho Books. Every validated invoice is written here before a Zoho sync is attempted. When Zoho is unavailable — and it will be, at some point — the data sits safely in MongoDB and syncs when the connection is restored. Nothing is lost in transit.</p>
      
      <h3 id="presentation-layer">Presentation Layer — React SPA</h3>
      
      <p>The review dashboard is where the accounting team handles quarantined invoices. Each flagged invoice arrives with the extraction output alongside the original document, so the reviewer can see exactly what the system captured and correct it before it moves forward. The dashboard also exposes the usage metrics the finance manager needs to track system performance over time.</p>
      
      <h3 id="accounting-integration">Accounting Integration — Zoho Books</h3>
      
      <p>Validated invoices sync to Zoho via API — vendor resolution, bill creation, ledger assignment, and TDS capture. More on the TDS part shortly.</p>
      
      <hr />
      
      <h2 id="non-functional-requirements">Non-Functional Requirements</h2>
      
      <h3 id="security">Security</h3>
      
      <p>The manual process had many exposure points: invoices forwarded through open email threads, downloaded to local machines, entered by multiple staff with broad system access. Each of those is a risk surface.</p>
      
      <p>The automated system reduces that surface significantly. OAuth tokens rotate every hour and are refreshed automatically. Access is role-based — staff see only what their role permits. All API communication is encrypted in transit. Every invoice has an immutable end-to-end audit trail: when it arrived, what was extracted, what was changed, when it was booked. Fewer touch points. Narrower access. Full traceability.</p>
      
      <h3 id="reliability-and-fault-tolerance">Reliability and Fault Tolerance</h3>
      
      <p>The system is designed around the assumption that external services will fail. MongoDB buffers all data before Zoho sync, so downtime in Zoho does not cause data loss. <code>token_service.py</code> handles OAuth expiry transparently — it intercepts the failed request, refreshes the token, and retries without any manual intervention. Network timeouts trigger automatic retries with exponential backoff. Idempotency keys at the ingestion point ensure the same invoice cannot be processed twice, regardless of how many times a vendor sends it.</p>
      
      <p>An invoice that enters this system does not disappear.</p>
      
      <h3 id="observability">Observability</h3>
      
      <div className="diagram-container my-8">
        <SystemHealthDashboard />
      </div>
      
      <p>The observability layer is split into two views because the people looking at it are asking different questions.</p>
      
      <p>System health metrics are monitored by the support engineer. API uptime, error rates, retry counts, queue depth, failed job logs. This view is for catching problems early — before users report them.</p>
      
      <div className="diagram-container my-8">
        <FinanceUsageDashboard />
      </div>
      
      <p>Usage metrics are monitored by the finance manager. Invoice volume processed, average processing time per invoice, human intervention rate, and how that rate is trending. In the early months of operation, roughly 50% of invoices required some form of human correction. At steady state, that figure is below 5%. In one recent month, 89 of 94 invoices processed without any intervention. Five were quarantined for review. That trend is visible in the dashboard, measured in real time.</p>
      
      <hr />
      
      <h2 id="how-we-faced-undocumented-api-endpoints">How We Faced Undocumented API Endpoints in Zoho and Solved It</h2>
      
      <p>Zoho Books has thorough documentation for standard invoice operations. It does not document the API endpoints for TDS and tax detail capture — at all.</p>
      
      <p>We spent considerable time attempting to handle TDS fields through the standard bill creation endpoints before concluding the endpoints we needed were simply not in the public documentation. We contacted Zoho support directly, explained the use case, and requested the specific endpoint. They provided it. The integration then worked correctly. But that was a week of unplanned effort, integrating an undocumented endpoint under timeline pressure.</p>
      
      <p>For anyone building on a third-party accounting system in the Indian market: TDS is not an edge case. It is mandatory. Do not assume the standard API documentation covers it. Build time for a support escalation into your integration plan.</p>
      
      <hr />
      
      <h2 id="lived-experience-failures">Lived Experience — Failures and How We Corrected Them</h2>
      
      <h3 id="missing-quantity-and-rate">Missing quantity and rate producing wrong totals in Zoho</h3>
      
      <p>Some vendors do not list quantity and rate as separate fields on their invoices. The total is stated, but the breakdown is not. When we fed these invoices through the system, the LLM assigned zero to the quantity and rate fields because there was nothing explicit to extract.</p>
      
      <p>The result was a bill created in Zoho with a zero quantity or zero rate, which produced an incorrect total. The system reported the invoice as successfully processed. The wrong number was already in the books.</p>
      
      <p>The fix was a validation gate: if quantity or rate on any line item is zero or null on an invoice with a non-zero total, the invoice is quarantined before any Zoho write happens. A human reviewer supplies the correct values and approves it. The system does not guess at numerics.</p>
      
      <h3 id="multiple-invoices-arriving">Multiple invoices arriving in a single email</h3>
      
      <p>Our initial ingestion logic assumed one email contained one invoice. A vendor then began sending three invoices as separate attachments in a single message. The system processed the first attachment and ignored the rest with no error or flag.</p>
      
      <p>We rearchitected the ingestion step to enumerate all attachments in every incoming email and create a separate, independent processing job for each one.</p>
      
      <h3 id="vendor-identity-mismatch">Vendor identity mismatch</h3>
      
      <p>For vendors who are not GST-registered, the LLM occasionally matched invoice fields to the wrong vendor record in our master — typically because of similar names or overlapping address data. We enforced explicit GSTIN-to-vendor mapping in the validation layer. Where GSTIN is absent, identity is verified against PAN and registered address before the invoice proceeds.</p>
      
      <h3 id="duplicate-invoice-submissions">Duplicate invoice submissions</h3>
      
      <p>Vendors resend invoices. Emails are forwarded. People accidentally resubmit the same document. An idempotency key is assigned to every invoice at the point of ingestion. The same invoice cannot enter the system a second time, regardless of how many times it arrives.</p>
      
      <hr />
      
      <h2 id="edge-cases">Edge Cases</h2>
      
      <p><strong>Implicit line item structure.</strong> Some invoices state a total without separating it into quantity and rate. The system now detects this pattern and treats the line as a single amount rather than attempting to decompose fields that are not there.</p>
      
      <p><strong>Unregistered vendors.</strong> Our initial validation required a GSTIN on every invoice. A separate processing pathway now handles unregistered vendors, verifying identity through PAN, bank account details, or registered address.</p>
      
      <p><strong>Non-standard invoice formats.</strong> Heavily stylised invoices or those using non-English text occasionally produce partial extractions from Unstract. These are routed to the quarantine queue automatically rather than proceeding with incomplete data.</p>
      
      <hr />
      
      <h2 id="outcomes">Outcomes</h2>
      
      <table className="outcomes-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Before</th>
            <th>After</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Processing time per invoice</td>
            <td>10+ minutes</td>
            <td>Under 30 seconds</td>
          </tr>
          <tr>
            <td>Error rate</td>
            <td>2 to 3%</td>
            <td>Under 0.01%</td>
          </tr>
          <tr>
            <td>Manual data entry</td>
            <td>Every invoice</td>
            <td>Reduced by over 90%</td>
          </tr>
          <tr>
            <td>Human intervention rate</td>
            <td>Every invoice</td>
            <td>Around 5% of invoices</td>
          </tr>
          <tr>
            <td>Invoice traceability</td>
            <td>15+ minutes of manual search</td>
            <td>Instant via audit trail</td>
          </tr>
        </tbody>
      </table>
      
      <hr />
      
      <h2 id="what-we-learned">What We Learned</h2>
      
      <p><strong>Persist before processing.</strong> Save the raw document the moment it arrives. Everything downstream can be retried. The original cannot be recreated.</p>
      
      <p><strong>Extract with AI, decide with rules.</strong> LLMs read unstructured documents well. They should not be making ledger assignments or vendor decisions. Keep business logic in deterministic, auditable code.</p>
      
      <p><strong>Quarantine is a feature.</strong> Human review of flagged invoices is not a fallback — it is how the system stays accurate while it matures, and how you collect signal to improve validation over time.</p>
      
      <p><strong>Third-party documentation has gaps.</strong> Especially for domain-specific requirements. Find out early and escalate before it is a timeline problem.</p>
      
      <p><strong>Two dashboards, two stakeholders.</strong> System health and business usage are different concerns and need separate views built for the people who act on each.</p>
      
      <hr />
      
      <h2 id="where-things-stand">Where Things Stand</h2>
      
      <p>90% of our vendor invoices are now processed end-to-end without any manual effort. The remaining 10% go through human review — not because the system cannot handle them, but because they carry edge cases that need a human decision before they touch the books.</p>
      
      <p>The finance manager no longer walks into an MIS review uncertain about the numbers. He walks in ready to talk about what the numbers mean. When a founder asks to see the supporting invoice for a transaction, it takes seconds.</p>
      
      <p>With the invoice pipeline stable, we are now extending the same approach to other parts of the finance workflow — credit card payment automation and reimbursement process automation are both in progress. The underlying architecture is the same: AI for extraction, rules for validation, humans for genuine exceptions.</p>
      
      <p>The goal was never to remove people from the process. It was to remove the volume work so that people with financial expertise can spend their time on the decisions that actually require it.</p>
      
      <hr />
      
      <p><em>CodeWalnut Engineering · June 2026</em></p>
    </div>
  );
}
