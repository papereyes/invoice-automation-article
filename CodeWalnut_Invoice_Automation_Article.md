# How We Stopped Dreading Invoice Season

*A ground-level account of building an AI-powered vendor invoice automation platform — the mission, the architecture, the Zoho struggles, the edge cases we missed, and what we finally got right.*

---

## The Problem We Couldn't Ignore

At CodeWalnut, our accounts payable process looked manageable on paper. A vendor emails a PDF. Someone from finance downloads it, reads it, verifies the vendor, keys in the data, validates the GST details, and creates a bill in Zoho Books. Clean, simple, repeatable.

Except it isn't. At 50 invoices a month, the process is annoying but survivable. Cross 100, and you start feeling it. At 500 or 1,000 invoices, you have a structural problem — one that no amount of headcount can solve cleanly. Each invoice takes more than 10 minutes end-to-end. The work is repetitive, the environment is high-stakes, and the margin for error is zero. Which is exactly the combination that guarantees errors.

The accounts payable process has two fundamental failure modes at scale:

1. **A significant and growing number of data entry errors** — wrong ledger entries, incorrect values (₹20,000 entered as ₹2,000), and duplicate invoice registrations when multiple people process the same email thread.
2. **A pileup of unprocessed invoices** that delays entries and makes timely MIS reporting impossible.

These weren't theoretical risks. In one MIS review, our co-founders spotted three or four errors in the total expenditure figures right there in the meeting room. Our finance manager — talented, diligent — had to sit through that knowing the root cause was data entry mistakes he couldn't fully prevent. He was walking into leadership reviews nervous, not confident.

The moment that made us decide something had to change: a founder asked to see the supporting invoices for ten specific transactions. The finance team spent the next fifteen minutes scrambling through email threads, inbox folders, and shared drives — and still couldn't locate several of the originals. Finance reports weren't just occasionally wrong. They had stopped being trustworthy.

---

## There Is A Better Way

The answer wasn't to avoid AI — it was to use it deliberately. LLMs are genuinely excellent at one specific thing: reading unstructured documents and pulling out structured fields. An invoice is exactly that kind of document. So we leaned into that strength.

Our approach was **pragmatic automation**. We used AI for data extraction — the part where human effort is highest and the format is most unpredictable. For everything that required business judgement — ledger assignment, GSTIN validation, vendor mapping — we used deterministic rules. Code that behaves the same way every single time, that can be audited, and that doesn't guess.

The third element was **human-in-the-loop validation**. Rather than trying to build a system that handles 100% of invoices automatically from day one, we designed a quarantine queue. Invoices that pass all checks are auto-processed. Those that fail — a missing field, a low-confidence extraction, a vendor mismatch — are routed to a review dashboard where a human makes the call. This isn't a fallback. It's a designed feature that keeps accuracy high while the system matures.

The combination of AI extraction, rule-based validation, and structured human oversight is what makes the system reliable. Not AI alone.

---

## The Architecture We Designed

> 📐 **[Architecture Diagram — insert here]**
> *Tiered system: Event & Ingestion Layer (n8n) → Application Service Layer (FastAPI) → Database Layer (MongoDB) → Presentation Layer (React SPA) → External Accounting (Zoho Books)*

The system is built across five distinct layers, each with a clear responsibility.

### Layer 1 — Event & Ingestion (n8n)

Everything starts with a Gmail trigger that listens for incoming vendor emails. When an email arrives, an extraction node decouples the payload and passes the invoice attachment to **Unstract**, our OCR engine, which converts the PDF to structured JSON. A custom JavaScript payload parser then normalises the output before it moves downstream.

The critical design decision here: **we persist the raw invoice binary to Google Drive before any AI touches it.** Not after extraction. Not after validation. First. An invoice that enters this system will never silently disappear.

### Layer 2 — Application Service (FastAPI)

The parsed JSON hits our FastAPI application layer, which has two key components working together:

**`token_service.py`** handles the entire OAuth2 lifecycle — token refresh, retry logic, and silent re-authentication. This became one of our most important pieces of infrastructure, for reasons we'll get to shortly.

**Invoice API Controller** runs the business logic: CRUD operations against MongoDB, data validation, business constraint enforcement, and session management. Critically, ledger assignment happens here — in deterministic rules code, not in the LLM. If the AI extracts a GSTIN, this layer cross-references it against our verified vendor master before anything moves forward. One GSTIN maps to exactly one vendor. No exceptions, no hallucinations.

### Layer 3 — Database (MongoDB)

MongoDB acts as our persistent buffer. Before anything is pushed to Zoho, the extracted and validated invoice data is written here. This means that if Zoho goes down mid-processing — and it will — the data is safe. We sync when the server comes back online. Nothing is lost in transit.

### Layer 4 — Presentation (React SPA)

The review dashboard gives the accounting team a human-in-the-loop interface. Invoices that pass all validation checks are auto-processed. Those that fail — missing fields, mismatched vendor, low-confidence extractions — are quarantined and routed here for manual review and override. This is a designed feature, not a fallback.

### Layer 5 — External Accounting (Zoho Books)

The final step is syncing validated, human-reviewed invoices into Zoho Books via their API — GSTIN vendor resolution, bill production, and ledger assignment. Which brings us to the part nobody mentions in architecture diagrams.

---

## The Zoho Struggle Nobody Documents

Zoho Books has solid documentation for standard invoice operations. What it doesn't document clearly — or in some cases, doesn't expose at all — are the API endpoints for **TDS and tax detail capture**.

We spent a significant amount of time trying to handle TDS fields through the standard bill creation endpoints before realising the endpoints we needed simply weren't in the public documentation. We had to contact Zoho's support team directly, explain what we were building, and request the specific endpoint. They provided it. But that was a week we hadn't planned for, integrating an undocumented API endpoint under time pressure.

The lesson: when you're building on top of a third-party accounting system, assume that the edge cases in your domain (and TDS is not an edge case in Indian accounting — it's mandatory) will not be covered in the standard docs. Build time for support escalation into your integration estimates.

---

## Lived Experience — Failures We Corrected

No system survives first contact with real data intact. Here is an honest account of what broke, what we missed, and how we fixed it.

### Missing quantity and rate fields → wrong values in the system

This was the most instructive failure we had. Some vendors send invoices where the quantity or rate isn't explicitly listed as a separate field — it's implied by the line item description or simply absent. The LLM, having nothing concrete to extract, would assign zero to those fields and move on. Confidently. Silently.

The downstream effect was serious: a bill would be created in Zoho with a zero quantity or zero rate, producing a wrong total that nobody caught until reconciliation. The system had processed the invoice successfully — it just had the wrong numbers inside it.

The fix was an explicit validation gate: if quantity or rate on any line item is zero or null, and the invoice total is non-zero, the invoice is quarantined immediately. We do not allow the model to fill in missing numerics with assumptions. A human reviews it, supplies the correct values, and only then does it move forward.

### Multiple invoices in a single email

We assumed one email equalled one invoice. Then a vendor started sending three invoices as attachments in a single message. Our system read the first attachment and silently ignored the rest. Two invoices went unprocessed — no error, no flag.

We rearchitected the ingestion step to enumerate all attachments on every incoming email and create separate, independent processing jobs for each one.

### Vendor mismatch via LLM hallucination

For non-GST-registered vendors, the LLM occasionally mapped invoice details to the wrong vendor in our master — a result of similar names or shared address fields. The fix was enforcing explicit GSTIN-to-vendor mapping at the validation layer. One GSTIN maps to exactly one vendor record. The model extracts; the rules decide.

### Duplicate invoice entry

Vendors resend invoices. Emails get forwarded. People accidentally resubmit. We implemented an idempotency key at the point of ingestion — every invoice gets a unique key the moment it arrives, and the same invoice cannot enter the system a second time regardless of how many times it's sent.

### Zoho API downtime and token expiry

We built MongoDB as a buffer from the start, assuming Zoho would be unavailable at some point. What we also handled proactively: OAuth token expiry mid-run. `token_service.py` intercepts the 401, silently refreshes the token, and retries the request — no human intervention, no data loss, no interruption visible to the user.

---

## Edge Cases Worth Calling Out Separately

Some issues weren't failures — they were gaps in our initial assumptions that only surfaced with real invoice data.

**Invoices with implicit line item structure** — Some vendors don't separate quantity and rate at all. The total is the total. We now detect this pattern and handle it as a single-line item rather than trying to decompose it.

**GST number absent on vendor invoices** — Not all vendors are GST-registered. Our initial validation required a GSTIN on every invoice. We had to build a separate pathway for unregistered vendors that still validates vendor identity through other fields (PAN, bank account, registered address).

**Granular ledger mapping** — We had to cover ledger mapping for each and every different vendor, which initially was not a very easy thing to do due to the API structuring from Zoho. We built out a dedicated endpoint to fetch the chart of accounts and updated our internal schemas so that users can select the correct ledger account dynamically in the review dashboard.

---

## We Don't Guess. We Measure.

We built two distinct metrics viewing systems into the platform — because the people who need to understand the system are asking fundamentally different questions.

**System health metrics** are for the support engineer. Is the API responding? Are there retry spikes? Is the queue backing up? Did something fail silently overnight? This view is about catching technical issues early — ideally before anyone else in the business notices something is wrong. Uptime, error rates, queue depth, failed job logs — that's the language of this dashboard.

**Usage metrics** are for the finance manager. How many invoices were processed this month? How long did each one take on average? How many went straight through versus needing human intervention? This view is about understanding the system's real-world performance and whether it's actually delivering on its promise.

The usage metrics told a clear story as the system matured. In the early months, roughly 50% of invoices needed some form of human correction or override. By the time we reached steady state, that number was down to 5% — out of 94 invoices in one recent month, 89 went straight through and only 5 needed quarantine and human-in-the-loop correction. That trend is visible directly in the dashboard. Not guessing. Measuring.

Two metrics systems. Two stakeholders. Do not merge them.

---

## The Results

After three months of building, testing, and correcting:

| Metric | Before | After |
|---|---|---|
| Processing time per invoice | 10+ minutes | < 30 seconds |
| Error rate | 2–3% | < 1% |
| Manual data entry | Every invoice | Reduced by 90%+ |
| Human-in-loop interventions | ~50% of invoices | ~5% of invoices |
| Invoice traceability | 15+ min manual search | Instant audit trail |

---

## Lessons For Anyone Building This

**1. Persist before you process.**
Store the raw invoice the moment it arrives. Everything downstream can be retried. The original source document cannot be recreated.

**2. Use AI for extraction, not judgement.**
LLMs are excellent at reading unstructured documents. They are not reliable at making business rule decisions — ledger assignment, vendor mapping, tax classification. Keep those in deterministic, auditable code.

**3. Build human-in-the-loop as a feature, not a fallback.**
Design the quarantine queue intentionally. When humans correct a flagged invoice, that's signal you can use to tighten your validation rules over time.

**4. Third-party API documentation lies by omission.**
Your domain's non-negotiable requirements (TDS, in our case) may not appear in the standard docs. Find out early, escalate to support, and budget the time.

**5. Two dashboards, not one.**
Engineering health and business usage are different concerns. Build separate views for the people who care about each.

---

## Where We Are Now

The accounting manager no longer walks into an MIS review nervous. He walks in with the numbers, confident they're right, ready to talk about what they mean. When a founder asks to see the supporting invoice for a transaction, it takes seconds — not fifteen minutes of inbox archaeology.

Automation is not about replacing the finance team. It's about removing the repetitive, error-prone work so that talented people can focus on decisions that matter — not on whether the numbers are right, but on what the numbers are telling you.

That was worth the three months.

---

*CodeWalnut Engineering · June 2026*