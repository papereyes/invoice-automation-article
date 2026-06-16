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

## There Is A Better Way — Just Not A Magic One

The approach we landed on was **pragmatic automation**: use AI where it excels (extracting data from unstructured input), use deterministic rules where accuracy is non-negotiable (ledger mapping, GSTIN validation), and keep humans in the loop for exceptions — not for everything. That combination is what we spent three months building.

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

## Where We Tripped

Honest account of the edge cases we missed or had to correct:

Our first instinct was to reach for AI. LLMs are genuinely excellent at reading unstructured documents and pulling out structured fields. But we learned quickly that AI alone is not the answer.

LLMs are probabilistic. In an early test, we fed the model an invoice with no quantity field. The model, having nothing to work from, assigned zero — confidently, silently. The actual invoice value was ₹2,50,000. No error. No flag. Just a wrong number flowing downstream.

### Missing quantity → hallucinated zero

When a quantity field was absent from an invoice, the LLM assigned zero — confidently. We added an explicit check: if a required numeric field is null or zero on an invoice where a non-zero amount is present, the invoice is quarantined. We do not let the model fill in missing numerics.

### Multiple invoices in a single email

We assumed one email equalled one invoice. Then a vendor started sending three invoices as attachments in a single email. Our system read the first and silently ignored the rest. We rearchitected the ingestion step to scan all attachments in every email and create separate processing jobs for each one.

### Vendor mismatch via LLM hallucination

For non-GST-registered vendors, the LLM occasionally matched invoice details to the wrong vendor in our master. The fix was explicit GSTIN-to-vendor mapping enforced at the validation layer — not something the model decides.

### Duplicate invoice entry

Vendors resend invoices. Emails get forwarded. People accidentally resubmit. We implemented an idempotency key at the point of ingestion — every invoice gets a unique key on arrival, and the same invoice cannot enter the system twice regardless of how many times it arrives.

### Zoho API downtime

We built the assumption of Zoho being unavailable into the architecture from early on — using MongoDB as a buffer and implementing retry logic with exponential backoff. What we also handled: OAuth token expiry mid-run. `token_service.py` intercepts the 401, refreshes the token transparently, and retries the request without any human intervention or data loss.

---

## How We Know The System Is Healthy

We don't guess. We measure. But early on we made the mistake of building one dashboard and pointing both the accounting manager and the support engineer at it. They need completely different things.

**Usage Dashboard (Accounting Manager)**
How many invoices were processed this month. Average processing time. Human-in-the-loop intervention rate and how it's trending. In our early runs, roughly 50% of invoices needed some form of human correction. We've brought that below 5%. The accounting manager's job has shifted from fixing errors to reading patterns.

**Health Dashboard (Support Engineer)**
System uptime. API error rates. Retry counts. Queue depth. Failed job logs. This is the view that tells us something is silently going wrong before a user reports it.

Two different stakeholders. Two different dashboards. Do not merge them.

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
