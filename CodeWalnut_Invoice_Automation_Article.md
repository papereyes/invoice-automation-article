# How We Automated Vendor Invoice Processing at CodeWalnut

*Three months of building, breaking, and fixing an AI-assisted invoice platform. Here is what the architecture looks like, what went wrong, and what we learned from it.*

---

Before we get into the how, here are the three questions every finance manager asks when you pitch automation:

**What will it cost?** The platform runs on a self-hosted VPS, uses open-source tooling for workflow orchestration and OCR, and connects to Zoho Books which the team was already paying for. There is no per-invoice SaaS fee. The primary cost is setup and maintenance.

**How secure is our financial data?** Every communication is encrypted in transit. Access is role-based — finance staff see only what their role permits. OAuth tokens rotate automatically on a one-hour cycle. Every invoice has an immutable audit trail from the moment it arrives to the moment it is booked.

**How do we know it is working?** Two separate dashboards — one for system health monitored by the support engineer, one for usage and accuracy trends monitored by the finance manager. The numbers are measured in real time, not estimated after the fact.

Those three questions deserve real answers, not reassurances. The rest of this article is those real answers, with the architecture and the failures included.

---

## Manual Invoice Processing Breaks at Scale

The accounts payable process looks straightforward on paper. A vendor emails a PDF. Someone from finance downloads it, reads it, verifies the vendor details, keys the data into Zoho Books, validates the GST, and creates a bill. Repeatable, simple, manageable.

At 50 invoices a month, it holds. Cross 100, and you feel the strain. At 500 or 1,000 invoices, you have a structural problem that headcount alone cannot fix. Each invoice takes over 10 minutes end-to-end. The work is repetitive and high-stakes, and that combination guarantees mistakes over time.

The process breaks in two specific ways at scale. First, data entry errors accumulate — wrong ledger entries, incorrect values (a ₹20,000 invoice entered as ₹2,000), duplicate registrations when multiple people work the same inbox. Second, invoices pile up and entries get delayed, which means MIS reporting is always working from incomplete or stale data.

These were not theoretical risks for us. In one MIS review, the co-founders caught three or four errors in the total expenditure figures mid-meeting. The finance manager, who was doing diligent work, had to sit through that knowing the root cause was data entry slip-ups he could not fully prevent. He was walking into leadership reviews nervous, not prepared.

The incident that forced the decision: a founder asked to see the supporting invoices for ten specific transactions. The team spent fifteen minutes searching through email threads, inbox folders, and shared drives and still could not locate several of the originals. The reports were not just occasionally wrong. They had become untrustworthy.

---

## The Approach: AI for Extraction, Rules for Judgement, Humans for Exceptions

The solution was not to automate everything. It was to automate the right parts.

Large language models are well-suited to one specific task: reading unstructured documents and extracting structured fields. An invoice is exactly that kind of document, and we leaned into that. But AI extraction alone is not sufficient for financial data. LLMs are probabilistic. They fill in gaps with plausible answers, and in accounting, a plausible wrong answer is worse than no answer.

Our approach was to use AI for extraction, deterministic rules for business logic, and human review for anything the system is not confident about.

Ledger assignment, GSTIN validation, and vendor mapping are handled entirely in rules-based code. The model extracts; the rules decide. For invoices where the system cannot extract a required field cleanly, or where a validation check fails, the invoice goes to a quarantine queue for human review before anything reaches Zoho. This is a designed part of the system, not a workaround.

The result is a platform where the accounting team is not replaced — they are freed from the volume work and focused on the cases that genuinely need their attention.

---

## System Architecture

> 📐 **[Architecture Diagram — insert here]**
> *Five-layer system: n8n (ingestion) → FastAPI (application) → MongoDB (database) → React SPA (presentation) → Zoho Books (accounting)*

The platform is built across five layers, each with a single clear responsibility.

### Ingestion Layer — n8n on a Self-Hosted VPS

A Gmail trigger listens for incoming vendor emails. When an email arrives, an extraction node decouples the payload and passes every attachment to Unstract, our OCR engine, which converts the invoice PDF to structured JSON. A custom JavaScript parser then normalises that output before it moves downstream.

Two decisions here that shaped everything else. First, we enumerate all attachments in every email — not just the first one — because vendors sometimes send multiple invoices in a single message and the system needs to handle each one independently. Second, the raw invoice binary is saved to Google Drive before any processing begins. Before Unstract. Before the API. Before Zoho. If everything downstream fails, the original document is safe.

### Application Layer — FastAPI

The parsed JSON arrives at our FastAPI service, which handles two distinct responsibilities.

`token_service.py` manages the full OAuth2 lifecycle with Zoho — token rotation, retry logic, and silent re-authentication when a token expires mid-run. This became critical infrastructure, which we will come back to.

The Invoice API Controller runs the business logic: validation against our vendor master, GSTIN-to-vendor mapping, ledger assignment via rules, duplicate detection via idempotency keys, and session management. Critically, nothing in this layer delegates business decisions to the LLM. One GSTIN maps to exactly one vendor. If that mapping fails, the invoice is quarantined.

### Database Layer — MongoDB

MongoDB serves as a persistent buffer between our application layer and Zoho Books. Every validated invoice is written here before a Zoho sync is attempted. When Zoho is unavailable — and it will be, at some point — the data sits safely in MongoDB and syncs when the connection is restored. Nothing is lost in transit.

### Presentation Layer — React SPA

The review dashboard is where the accounting team handles quarantined invoices. Each flagged invoice arrives with the extraction output alongside the original document, so the reviewer can see exactly what the system captured and correct it before it moves forward. The dashboard also exposes the usage metrics the finance manager needs to track system performance over time.

### Accounting Integration — Zoho Books

Validated invoices sync to Zoho via API — vendor resolution, bill creation, ledger assignment, and TDS capture. More on the TDS part shortly.

---

## Non-Functional Requirements

### Security

The manual process had many exposure points: invoices forwarded through open email threads, downloaded to local machines, entered by multiple staff with broad system access. Each of those is a risk surface.

The automated system reduces that surface significantly. OAuth tokens rotate every hour and are refreshed automatically. Access is role-based — staff see only what their role permits. All API communication is encrypted in transit. Every invoice has an immutable end-to-end audit trail: when it arrived, what was extracted, what was changed, when it was booked. Fewer touch points. Narrower access. Full traceability.

### Reliability and Fault Tolerance

The system is designed around the assumption that external services will fail. MongoDB buffers all data before Zoho sync, so downtime in Zoho does not cause data loss. `token_service.py` handles OAuth expiry transparently — it intercepts the failed request, refreshes the token, and retries without any manual intervention. Network timeouts trigger automatic retries with exponential backoff. Idempotency keys at the ingestion point ensure the same invoice cannot be processed twice, regardless of how many times a vendor sends it.

An invoice that enters this system does not disappear.

### Observability

> 📊 **[Observability Dashboard Diagram — insert here]**
> *Audit trail, invoice received / processed / pushed to Zoho, accepted / rejected / pending counts, line chart of invoice volume over time*

The observability layer is split into two views because the people looking at it are asking different questions.

System health metrics are monitored by the support engineer. API uptime, error rates, retry counts, queue depth, failed job logs. This view is for catching problems early — before users report them.

Usage metrics are monitored by the finance manager. Invoice volume processed, average processing time per invoice, human intervention rate, and how that rate is trending. In the early months of operation, roughly 50% of invoices required some form of human correction. At steady state, that figure is below 5%. In one recent month, 89 of 94 invoices processed without any intervention. Five were quarantined for review. That trend is visible in the dashboard, measured in real time.

---

## How We Faced Undocumented API Endpoints in Zoho and Solved It

Zoho Books has thorough documentation for standard invoice operations. It does not document the API endpoints for TDS and tax detail capture — at all.

We spent considerable time attempting to handle TDS fields through the standard bill creation endpoints before concluding the endpoints we needed were simply not in the public documentation. We contacted Zoho support directly, explained the use case, and requested the specific endpoint. They provided it. The integration then worked correctly. But that was a week of unplanned effort, integrating an undocumented endpoint under timeline pressure.

For anyone building on a third-party accounting system in the Indian market: TDS is not an edge case. It is mandatory. Do not assume the standard API documentation covers it. Build time for a support escalation into your integration plan.

---

## Lived Experience — Failures and How We Corrected Them

### Missing quantity and rate producing wrong totals in Zoho

Some vendors do not list quantity and rate as separate fields on their invoices. The total is stated, but the breakdown is not. When we fed these invoices through the system, the LLM assigned zero to the quantity and rate fields because there was nothing explicit to extract.

The result was a bill created in Zoho with a zero quantity or zero rate, which produced an incorrect total. The system reported the invoice as successfully processed. The wrong number was already in the books.

The fix was a validation gate: if quantity or rate on any line item is zero or null on an invoice with a non-zero total, the invoice is quarantined before any Zoho write happens. A human reviewer supplies the correct values and approves it. The system does not guess at numerics.

### Multiple invoices arriving in a single email

Our initial ingestion logic assumed one email contained one invoice. A vendor then began sending three invoices as separate attachments in a single message. The system processed the first attachment and ignored the rest with no error or flag.

We rearchitected the ingestion step to enumerate all attachments in every incoming email and create a separate, independent processing job for each one.

### Vendor identity mismatch

For vendors who are not GST-registered, the LLM occasionally matched invoice fields to the wrong vendor record in our master — typically because of similar names or overlapping address data. We enforced explicit GSTIN-to-vendor mapping in the validation layer. Where GSTIN is absent, identity is verified against PAN and registered address before the invoice proceeds.

### Duplicate invoice submissions

Vendors resend invoices. Emails are forwarded. People accidentally resubmit the same document. An idempotency key is assigned to every invoice at the point of ingestion. The same invoice cannot enter the system a second time, regardless of how many times it arrives.

---

## Edge Cases

**Implicit line item structure.** Some invoices state a total without separating it into quantity and rate. The system now detects this pattern and treats the line as a single amount rather than attempting to decompose fields that are not there.

**Unregistered vendors.** Our initial validation required a GSTIN on every invoice. A separate processing pathway now handles unregistered vendors, verifying identity through PAN, bank account details, or registered address.

**Non-standard invoice formats.** Heavily stylised invoices or those using non-English text occasionally produce partial extractions from Unstract. These are routed to the quarantine queue automatically rather than proceeding with incomplete data.

---

## Outcomes

| Metric | Before | After |
|---|---|---|
| Processing time per invoice | 10+ minutes | Under 30 seconds |
| Error rate | 2 to 3% | Under 0.01% |
| Manual data entry | Every invoice | Reduced by over 90% |
| Human intervention rate | Every invoice | Around 5% of invoices |
| Invoice traceability | 15+ minutes of manual search | Instant via audit trail |

---

## What We Learned

**Persist before processing.** Save the raw document the moment it arrives. Everything downstream can be retried. The original cannot be recreated.

**Extract with AI, decide with rules.** LLMs read unstructured documents well. They should not be making ledger assignments or vendor decisions. Keep business logic in deterministic, auditable code.

**Quarantine is a feature.** Human review of flagged invoices is not a fallback — it is how the system stays accurate while it matures, and how you collect signal to improve validation over time.

**Third-party documentation has gaps.** Especially for domain-specific requirements. Find out early and escalate before it is a timeline problem.

**Two dashboards, two stakeholders.** System health and business usage are different concerns and need separate views built for the people who act on each.

---

## Where Things Stand

90% of our vendor invoices are now processed end-to-end without any manual effort. The remaining 10% go through human review — not because the system cannot handle them, but because they carry edge cases that need a human decision before they touch the books.

The finance manager no longer walks into an MIS review uncertain about the numbers. He walks in ready to talk about what the numbers mean. When a founder asks to see the supporting invoice for a transaction, it takes seconds.

With the invoice pipeline stable, we are now extending the same approach to other parts of the finance workflow — credit card payment automation and reimbursement process automation are both in progress. The underlying architecture is the same: AI for extraction, rules for validation, humans for genuine exceptions.

The goal was never to remove people from the process. It was to remove the volume work so that people with financial expertise can spend their time on the decisions that actually require it.

---

*CodeWalnut Engineering · June 2026*