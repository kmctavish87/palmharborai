# DutyLogic — Audit & Duty-Math Test Report

**Tested:** https://palmharborai.com/dutylogic/ (build `audit-openai-20260529-3`, bundle `index-Dd34RRuP.js`)
**Date:** 2026-05-31
**Backend:** `palmharborai.kmctavish87.workers.dev/api/*` (model `gpt-4.1`)
**Focus:** Correctness of HTS-code audits and duty recalculation math (Document Audit flow).
**Method:** Uploaded crafted spreadsheets, ran AI intake, intercepted the generated export in-browser, and parsed the audit columns (`Expected duty rate`, `Expected duty amount`, `Duty variance`, `Audit flags`, `Audit notes`) to compare against ground truth.

---

## Verdict

The duty **arithmetic** (rate × customs value) is correct in every case observed. **HTS-code normalization and validation** are solid. However, there is one **critical correctness bug**: the "expected duty rate" used as the audit baseline is **not a deterministic lookup from the HTS schedule** — it is biased toward the declared value, so over-declarations and impossible rates pass silently. There are also two medium issues around Section 301 / Chapter 99 duties and negative values.

---

## CRITICAL — Audit baseline copies the declared rate, hiding over-declarations

**The single most important finding.** For the same HTS code, the "Expected duty rate" changes depending on what rate was declared. When the declared rate is **at or above** the true schedule rate, DutyLogic adopts the declared rate as "expected," reports **variance 0.00 / Pass**, and misses the discrepancy. Only **under**-declarations get flagged.

### Reproduction (`determinism.xlsx`)
Five identical lines — same description, same HTS `9617.00.6000` (true general rate **7.2%**), same $1,000 customs value — differing only in the declared duty rate:

| Declared rate | Expected (tool) | Variance | Flag | Correct behavior |
|---|---|---|---|---|
| 7.2% | `7.2%` | 0.00 | Pass | ✅ correct |
| **7.5%** | `General: 7.5%` | 0.00 | **Pass** | ❌ should expect 7.2%, variance −3.00 |
| 5% | `7.2%` | −22.00 | Rate mismatch | ✅ correct |
| **20%** | `General: 20%` | 0.00 | **Pass** | ❌ absurd rate accepted |
| 0% | `7.2%` | −72.00 | Rate mismatch | ✅ correct |

**Tell:** rows that wrongly pass echo the declared string verbatim, including the `"General:"` prefix (`General: 7.5%`, `General: 20%`), whereas genuine schedule lookups render as a clean `7.2%`. This confirms the "expected" value is being copied from the declared input rather than resolved from the tariff tree.

**Corroborating evidence:** the same HTS `9617.00.6000` returned expected **7.5%** (Pass) in the clean-invoice run but **7.2%** (mismatch) in the edge-values run — i.e., the audit is non-reproducible for identical codes.

**Impact:** The tool gives false assurance. A broker overstating duty, or a fat-finger like 20%, passes with variance 0.00. As an audit/compliance tool this is the highest-severity class of error — it fails to catch the errors it exists to catch.

**Suggested fix:** Resolve the expected general/special rate purely from `hts-tree.json` for the audited HTS, independent of the declared rate. Compute variance against that. Never let the declared rate populate the "expected" field. Flag both over- and under-declarations.

---

## MEDIUM — Section 301 / Chapter 99 duties detected but never applied

For China-origin lines the tool correctly finds the Chapter 99 overlay (e.g. `9903.88.15`, +7.5%) but the note says it is *"not folded into the corrected duty because the source line did not declare Chapter 99 treatment."* The "expected duty amount" therefore reflects only the base rate.

**Impact:** For an audit tool that markets Section 301 awareness, the headline "expected duty" understates the true landed duty for Chinese goods, and the overlay only appears in free-text notes (easy to miss). A line under-declaring by omitting Section 301 entirely would still show variance 0.00 against the base rate.

**Suggested fix:** Compute and display the full expected duty (base + applicable Chapter 99) as a separate column, or at minimum raise a structured flag (not just a note) when a 9903 overlay applies to an origin/HTS combination.

---

## MEDIUM — Negative quantities/values produce negative duties without strong flagging

`edge_values.xlsx` "Negative qty widget" (qty −50, customs value −500) produced **Expected duty amount −82.50** with flag only "HTS review." A negative duty is not a valid result.

**Suggested fix:** Treat negative quantity/value/weight as a hard validation error (dedicated flag), and clamp or null the computed duty rather than emitting a negative dollar amount.

---

## LOW / Observations

- **Blank HTS line:** with no HTS code, "Expected duty amount" was populated as `25.00` (equal to the declared amount) with variance 0.00, while flags correctly said "HTS not found." The expected-amount column should be blank when no rate can be resolved, to avoid implying validation.
- **Internal line-math inconsistency caught well:** the "Bad math line" (unit 10 × qty 10 = 100, but extended value declared 5000) was correctly flagged as implausible, and duty was computed off customs value (100), not the bogus extended value. Good.
- **HTS normalization is strong:** `6109.10.0012.99.88` → `6109.10.00`; `6109 10 0012` (spaces) → `6109.10.00`; heading-only `6109` → "review / expected rate unavailable"; `ABCD.EF.GHIJ` and `9999.99.9999` → "HTS not found." All correct.
- **`palmharborai.com/api/*` is not wired** (GET returns the marketing homepage). This is harmless because the app calls the `*.workers.dev` origin directly — but if anything is ever expected to hit the apex `/api`, it will silently get HTML.

---

## What was verified vs. correct math

| Line | HTS | Customs value | Rate | Tool expected amt | Hand-check | Match |
|---|---|---|---|---|---|---|
| Cotton t-shirts | 6109.10.0012 | 8,500 | 16.5% | 1,402.50 | 8,500×.165=1,402.50 | ✅ |
| Bicycle frames | 8714.91.3000 | 42,000 | 3.9% | 1,638.00 | 42,000×.039=1,638.00 | ✅ |
| Water bottles | 9617.00.6000 | 15,000 | 7.5%* | 1,125.00 | 15,000×.075=1,125.00 | ✅ math / ❌ baseline (true 7.2%) |

\* The arithmetic is right; the *baseline rate* is the bug above.

---

## Coverage / not yet tested
This pass focused on the math + HTS audit per your request. Still available in the prepared battery (28 files) but not yet run through: PDF / Word / image extraction quality, the 10,000-row and oversized (>10 MB) files for client limits, the malformed/corrupt/spoofed files (0-byte, garbage-bytes, exe-as-xlsx), CSV edge parsing, the Schedule Explorer mode, and adversarial/prompt-injection content. Say the word and I'll run those too.
