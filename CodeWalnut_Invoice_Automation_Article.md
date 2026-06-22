# Building the AI-Powered Accounts Payable Automation System

*A Technical & Operational Overview by CodeWalnut Engineering — June 2026*

---

Before walking through the solution, three questions tend to arise in every conversation about automating financial workflows of this kind:

**What will this cost?**
The answer depends on infrastructure choices, existing software subscriptions, and the volume of invoices in play. A detailed breakdown is covered in the architecture section.

**How secure is the financial data?**
Security is built into the design of the system, not added on top of it. The specifics are addressed in the non-functional requirements section.

**How do we know it is actually working?**
Two dedicated dashboards track system health and business performance in real time. Every number reported is derived from actual transactions processed, with intervention rates, processing times, and error trends all visible as they happen.

---

## When Invoice Volume Grows Faster Than the Team Can Keep Up

The accounts payable process appears deceptively manageable on paper. A vendor emails a PDF. A member of the finance team downloads it, verifies the vendor details, keys the data into the accounting system, validates the GST, and creates a bill. At low volumes, this holds.

At 50 invoices a month, the process is fine. At 100, the strain becomes visible. At 500 or 1,000, the organisation faces a structural problem that additional headcount alone cannot resolve. Each invoice consumes over ten minutes of skilled staff time. The work is repetitive and high-stakes, a combination that makes errors not a risk but a certainty over time.

The process fails in two specific ways at scale. First, data entry errors accumulate: incorrect ledger assignments, transposed values (a 20,000 invoice entered as 2,000), duplicate registrations when multiple people work from a shared inbox. Second, the backlog of unprocessed invoices means management reporting is perpetually working from incomplete or stale figures.

In one finance review, three or four errors in total expenditure figures were identified mid-meeting. The finance manager, doing diligent and careful work, had no reliable mechanism to prevent data entry errors from surfacing at exactly the wrong moment.

The decision to build was forced by a single incident: a request came in for supporting invoices on ten specific transactions. After fifteen minutes of searching through email threads, inbox folders, and shared drives, several originals still could not be located. The reports had not simply become occasionally unreliable. The data had become untrustworthy.

---

## Extraction by AI, Logic by Rules, Approval by People

The goal was to identify exactly which parts of the process benefit from automation, and build precisely for those.

Large language models are well suited to one specific task: reading unstructured documents and returning structured data. An invoice is exactly that kind of document. AI extraction alone, however, is insufficient for financial data. These models are probabilistic. Gaps get filled with plausible answers, and in accounting, a plausible wrong answer is worse than no answer at all.

The approach separates concerns clearly: AI handles extraction, deterministic rules handle business logic, and human reviewers handle anything the system cannot resolve with confidence.

Ledger assignment, GST validation, and vendor mapping are handled entirely in rules-based code. The model reads; the rules decide. Where the system cannot extract a required field cleanly, or where a validation check fails, the invoice is routed to a quarantine queue for human review before anything is committed to the accounting system. This is a designed feature, not a workaround, and it is how the system maintains accuracy while continuing to improve.

The result: volume processing handled automatically, and finance expertise reserved for cases that genuinely require human judgement.

---

## System Architecture

> 📐 **[Architecture Diagram — insert here]**
> *Five-layer system: n8n (ingestion) → FastAPI (application) → MongoDB (database) → React SPA (presentation) → Zoho Books (accounting)*

The platform is built across five layers, each with a clearly defined responsibility.

### Ingestion — Workflow Orchestration on a Self-Hosted Server

An email trigger monitors the shared vendor inbox. When a message arrives, every attachment is enumerated and each invoice PDF is passed to the OCR engine, which converts it to structured JSON. A normalisation step standardises the output before moving downstream.

Two architectural decisions proved consequential here. First, every attachment in every email is processed independently, because vendors routinely send multiple invoices in a single message and each must be handled as a separate transaction. Second, the raw invoice file is saved to cloud storage before any processing begins, before OCR, before the application layer, before the accounting system. If everything downstream fails, the original document is preserved.

### Application Layer — Business Logic and Validation

Parsed data arrives at the application service, which handles two distinct functions. Token management governs the full authentication lifecycle with the accounting system, including automatic rotation, retry logic, and silent re-authentication when a session expires mid-run. The invoice controller runs the business logic: validation against the vendor master, GST-to-vendor mapping, ledger assignment, duplicate detection via idempotency keys, and exception routing.

No business decisions are delegated to the AI model. One GST number maps to exactly one vendor. If that mapping fails, the invoice is quarantined.

### Database Layer — Persistent Buffer

Every validated invoice is written to the database before any sync to the accounting system is attempted. When the accounting platform is unavailable, data sits safely in the buffer and syncs once the connection is restored. Nothing is lost in transit.

### Review Interface — Finance Team Dashboard

Quarantined invoices are presented to the accounting team alongside the original document and the extraction output, side by side, so the reviewer can see precisely what was captured and correct it before the record is committed. The same interface surfaces the usage metrics needed to track system performance over time.

### Accounting Integration

Validated invoices sync via API. Vendor resolution, bill creation, ledger assignment, and tax capture are all handled programmatically.

---

## Non-Functional Requirements

### Cost

> 📊 **[Cost vs Invoice Volume Chart — insert here]**

The two questions raised at the outset deserve direct answers here.

On cost: The platform costs very little to run at any realistic invoice volume. Infrastructure runs on a DigitalOcean VPS at $6 a month. AI extraction, based on actual usage data, works out to roughly $0.028 per invoice.

| Monthly Invoice Volume | Estimated Platform Cost |
|---|---|
| 50 invoices | ~$7.38 |
| 500 invoices | ~$19.83 |
| 1,000 invoices | Under $34 |

No per-invoice SaaS fees. No automation middleware subscriptions. No additional Zoho costs — Zoho Books was already part of the team's existing stack before the project began. The primary cost is setup, integration, and ongoing maintenance.

### Security

The manual process carried significant exposure. Invoices forwarded through open email threads, downloaded to personal machines, entered by staff with broad system access. Each of those is a risk surface.

The automated system narrows that surface considerably. Tokens rotate hourly and refresh automatically. Access is role-based — staff see only what the function requires. All communication is encrypted in transit. Every invoice carries an immutable audit trail: when it arrived, what was extracted, what was amended, when it was booked. Fewer touch points. Narrower access. Complete traceability.

### Reliability

External services fail, and data extraction is inherently probabilistic. The system is designed with these assumptions built in from the start.

To ensure data accuracy, strict guideline rules are enforced, and raw data extracted via OCR undergoes a rigorous double LLM verification process. This multi-layered validation ensures that no hallucinated or incorrect values make it into the accounting system.

Furthermore, the database buffers all data before any accounting sync is attempted, so downtime in the accounting platform does not cause data loss. Authentication management handles token expiry transparently, intercepting the failure, refreshing credentials, and retrying without manual intervention. Network timeouts trigger automatic retries with exponential backoff. Idempotency keys at ingestion ensure the same invoice cannot enter the system twice, regardless of how many times a vendor submits it.

An invoice that enters this system does not disappear, and its data is systematically verified.

### Observability

> 📊 **[Observability Dashboard Diagram — insert here]**
> *Audit trail, invoice received / processed / pushed to Zoho, accepted / rejected / pending counts, line chart of invoice volume over time*

Visibility into performance is split into two views, because the people looking at them are asking fundamentally different questions.

System health metrics are monitored by the engineering team: API uptime, error rates, retry counts, queue depth, and failed job logs. This view exists to surface problems before anyone else notices them.

Usage metrics are monitored by finance leadership: invoice volume processed, average processing time, human intervention rate, and how that rate trends over time. In the early months of operation, roughly 50% of invoices required some form of human correction. At steady state, that figure sits below 5%. In one recent month, 89 of 94 invoices were processed without any intervention. Five were quarantined for review. That trend is visible in the dashboard, measured in real time.

| Metric | Before | After |
|---|---|---|
| Processing time per invoice | 10+ minutes | Under 30 seconds |
| Error rate | 2-3% | Under 0.01% |
| Manual data entry | Every invoice | Reduced by over 90% |
| Human intervention rate | Every invoice | Around 5% of invoices |
| Invoice traceability | 15+ minutes of manual search | Instant via audit trail |

---

## Challenges Encountered and How Each Was Resolved

**1. Undocumented API endpoints in the accounting system**

Standard API documentation covered routine invoice operations but did not document the endpoints required for TDS capture. After exhausting the documentation, a direct escalation to Zoho support yielded the required endpoint. The integration then proceeded correctly, but this consumed a week of unplanned effort.

For any organisation building on a third-party accounting platform in the Indian market: TDS is not an edge case. It is a compliance requirement. Time for a support escalation should be built into the integration plan from the start.

**2. Invoices missing quantity and rate breakdowns**

Some vendors state only a total without separating component fields. The model, finding nothing to extract, returned zero for quantity and rate. The system treated these invoices as successfully processed; incorrect figures were already in the books before the pattern was caught.

The fix was a validation gate: any line item on an invoice with a non-zero total that carries a zero or null quantity or rate is quarantined before any write occurs. A human reviewer supplies the correct values. The system does not estimate numerals.

**3. Multiple invoices in a single email**

The initial ingestion logic assumed one email contained one invoice. When a vendor began sending three invoices as separate attachments in a single message, the system processed the first and silently ignored the rest. The ingestion layer was rearchitected to enumerate all attachments independently and create a separate processing job for each.

**4. Vendor identity mismatches**

For vendors without GST registration, the model occasionally matched invoice fields to the wrong vendor record, typically due to similar names or overlapping address data. Explicit GST-to-vendor mapping was enforced in the validation layer. Where GST registration is absent, identity is verified against PAN and registered address before the invoice proceeds.

**5. Duplicate submissions**

Vendors resend invoices. Emails get forwarded. Documents get resubmitted accidentally. An idempotency key is now assigned to every invoice at ingestion. The same invoice cannot enter the system twice, regardless of how many times it arrives.

---

## Exceptions the Platform Accounts For

**1. Implicit Line Item Structure**

Some invoices state a total without separating it into quantity and rate. Rather than attempting to decompose fields that are not present, the system detects this pattern and treats the line as a single amount, routing it cleanly through the pipeline.

**2. Unregistered Vendors**

Standard validation requires a GSTIN on every invoice. For vendors operating without GST registration, a separate processing pathway handles identity verification through PAN, bank account details, or registered address before the invoice proceeds.

**3. Non-Standard Invoice Formats**

The system can also handle non-standard invoice formats, such as heavily stylised invoices or those carrying non-English text, through proper OCR and double LLM verification to ensure extraction accuracy before committing to the books.

---

## Principles That Guided the Build

- **Persist before processing.** Save the raw document the moment it arrives. Everything downstream can be retried. The original cannot be recreated.
- **Extract with AI; decide with rules.** Language models read unstructured documents well. Ledger assignments and vendor decisions belong in deterministic, auditable code.
- **Quarantine is a feature, not a fallback.** Human review of flagged invoices is how accuracy is maintained while the system matures, and how the signal is built to improve validation over time.
- **Third-party documentation has gaps.** Especially for domain-specific compliance requirements. These need to be identified early and escalated before they become timeline problems.
- **Two dashboards, two stakeholders.** System health and business performance are different concerns and need separate views built for the people who act on each.

---

## Where This Leads

The platform now handles 90% of vendor invoices end-to-end without manual effort. The remaining 10% pass through a human approval stage, not as a system limitation, but as a designed checkpoint for invoices that benefit from a final review before being committed.

Finance leadership no longer walks into an MIS review uncertain about the numbers. Supporting invoices for any transaction are retrievable in seconds, not minutes.

With the invoice pipeline stable, the same architecture is being extended to credit card payment automation and employee reimbursement processing. The underlying approach remains unchanged: AI for extraction, rules for validation, humans for genuine exceptions.

The goal was never to remove people from the process. The goal was to remove the volume work, so that financial expertise can be directed toward the decisions that actually require it.

---

*CodeWalnut Engineering · June 2026*