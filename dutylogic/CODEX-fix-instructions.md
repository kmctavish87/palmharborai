# Codex Task — Fix DutyLogic audit/duty-math bugs

> **Note on repo layout:** This palmharborai repo only contains DutyLogic's *built* bundle
> (`dutylogic/assets/index-*.js`) and the JSON data files. The React **source** and the
> `extract-documents` API handler are in a separate project. Run these fixes in the
> repo that holds DutyLogic's source. Each task below gives grep anchors so you can find
> the relevant code regardless of file names.

Work through the tasks in priority order. After each, add/adjust a unit test and run the acceptance check described. Do not change unrelated behavior.

---

## TASK 1 (CRITICAL) — Expected duty rate must come only from the HTS schedule, never from the declared value

### Problem
The audit's "Expected duty rate" is biased toward the declared rate. With the same HTS code and value, only the declared rate changing:

| Declared | Expected (current) | Flag (current) | Should be |
|---|---|---|---|
| 7.2% | 7.2% | Pass | Pass |
| 7.5% | 7.5% | Pass ❌ | expect 7.2%, flag over-declaration |
| 5%   | 7.2% | Rate mismatch | Rate mismatch |
| 20%  | 20%  | Pass ❌ | expect 7.2%, flag |
| 0%   | 7.2% | Rate mismatch | Rate mismatch |

True general rate for `9617.00.6000` is **7.2%**.

### Root-cause hypothesis (check this first)
The pattern "declared ≥ schedule → pass; declared < schedule → flag" is exactly what
`expectedRate = max(declaredRate, scheduleRate)` produces. Also, on the passing rows the
exported "Expected duty rate" echoes the declared string **including its `"General:"`
prefix** (`General: 7.5%`, `General: 20%`), while genuine lookups render as a clean
`7.2%`. Both facts indicate the declared value is leaking into the expected value.

### Find it
Grep the source for the expected-rate / variance logic. Likely anchors:
- `Expected duty rate`, `expected_duty_rate`, `expectedRate`, `Duty variance`, `Audit flags`
- `Math.max(` near a rate or duty comparison
- a fallback like `lookupRate || declared`, `?? declared`, `expected = ... : declared`
- the function that builds export rows (search `Expected HTS description` — the column header is created near the row-builder)
- rate parsing helpers (search `Number.isFinite` near `customsValue`, and any `adValoremPercent`)

### Fix
1. Resolve the expected general (and special, if origin qualifies) rate **solely** from
   `hts-tree.json` for the audited HTS number. Build/confirm a pure function:
   `getScheduleRate(htsNumber, { origin }) -> { rate: number|null, source: 'general'|'special'|'column2', raw: string }`.
   It must not read the declared rate at all.
2. `expectedRate = scheduleRate` (never `max(declared, schedule)`, never `declared` as a
   fallback). If the schedule lookup returns null (code not found / heading-only), set
   expected rate to **blank** and flag `Expected rate unavailable` — do **not** fall back
   to the declared rate.
3. `expectedDutyAmount = expectedRate * customsValue` (or the correct unit basis for
   specific/compound rates — see Task 4).
4. Variance = `declaredDutyAmount - expectedDutyAmount`. Flag **both** directions:
   - `declared > expected` → `Over-declared duty` (overpayment)
   - `declared < expected` → `Under-declared duty` (underpayment / compliance risk)
   - within a tolerance (e.g. ±$0.01 or ±0.1%) → `Pass`
5. Strip any `"General: "` / `"Special: "` prefix before parsing a rate to a number, and
   store the expected rate as a normalized numeric/string pair so the export never echoes
   the declared string.

### Acceptance check
Create a spreadsheet with 5 identical lines (desc, HTS `9617.00.6000`, customs value 1000)
and declared rates `7.2%, 7.5%, 5%, 20%, 0%`. After intake+export, the "Expected duty
rate" column must read `7.2%` on **all five** rows, expected amount `72.00` on all five,
and flags: Pass, Over-declared, Under-declared, Over-declared, Under-declared.
Re-running the same file twice must produce identical expected rates (determinism).

---

## TASK 2 (MEDIUM) — Apply Section 301 / Chapter 99 overlays to the expected duty, as structured data

### Problem
For China-origin lines the tool finds the Chapter 99 overlay (e.g. `9903.88.15 +7.5%`) but
only mentions it in free-text notes: *"not folded into the corrected duty because the
source line did not declare Chapter 99 treatment."* The headline expected duty therefore
understates the true landed duty, and a line that omits Section 301 entirely still shows
variance 0.00 against the base rate.

### Find it
- Grep: `9903`, `chapter99`, `Chapter 99`, `not folded`, `chapter99-mappings`, `chapter99-rules`
- Locate where `chapter99-mappings.json` / `chapter99-rules.json` are loaded and matched to a base HTS.

### Fix
1. When an applicable Chapter 99 overlay exists for the (HTS, country-of-origin) pair,
   compute `expectedDutyFull = base + sum(applicable 9903 additional rates)`.
2. Add explicit export columns so it's not buried in notes, e.g.:
   - `Section 301 / Ch.99 applicable` (yes/no + the 9903 code(s))
   - `Expected duty (base)` and `Expected duty (with Ch.99)`
3. Compare the declared duty against the **with-Ch.99** expected amount and raise a
   structured flag (e.g. `Section 301 not applied`) when the declared duty omits an
   overlay that the (HTS, origin) pair requires — not just a note.
4. Keep matching strictly by country of origin (overlays apply to China-origin etc.); do
   not apply to non-covered origins. Confirm with the Taiwan/Vietnam lines that no overlay
   is added.

### Acceptance check
A China-origin `6109.10.0012` line at base 16.5% with no declared Ch.99 must show the
overlay applied in the expected-with-Ch.99 column and a `Section 301 not applied` flag.
A Taiwan line must show no overlay.

---

## TASK 3 (MEDIUM) — Reject negative quantity / value / weight as a hard error

### Problem
A line with qty −50 and customs value −500 produced **Expected duty amount −82.50** with
only a soft `HTS review` flag. Negative duty is never a valid result.

### Find it
- Grep the rate→amount computation (search `customsValue`, the `wF`/duty helper in the
  bundle corresponds to a `computeDuty(rate, value)` in source) and the field-validation step.

### Fix
1. Validate quantity, customs value, weight, extended value: if any required-for-duty
   field is negative (or non-numeric where a number is required), set a dedicated flag
   `Invalid value (negative)` and **do not** emit a computed duty — leave expected amount
   blank/null rather than negative.
2. Treat zero customs value as valid but rate comparison still runs (this already works —
   keep it: declared 0% vs expected 3.9% on a $0 line correctly flags `Rate mismatch`).

### Acceptance check
The negative-qty line yields blank expected amount + `Invalid value (negative)` flag; no
negative dollar figure anywhere in the export.

---

## TASK 4 (LOW) — Blank-HTS line must not populate an expected amount

### Problem
A line with no HTS code showed `Expected duty amount = 25.00` (equal to the declared
amount) with variance 0.00, while flags correctly said `HTS not found`. The expected
amount should be blank when no rate can be resolved.

### Fix
When `getScheduleRate` returns null (no HTS, heading-only, not found, non-HTS string),
leave **both** expected rate and expected amount blank and set variance blank. This is the
same no-fallback rule as Task 1; verify the blank-HTS and heading-only (`6109`) and
`9999.99.9999` cases all produce blank expected amounts.

---

## TASK 5 (LOW) — Specific & compound duty rates

While fixing Task 1, confirm `getScheduleRate` and the amount computation handle
non-ad-valorem rates from the schedule (e.g. `14.27¢/liter`, compound `x% + y¢/kg`). The
data files contain these (`generalRateOfDuty` like `"14.27¢/ liter"`). If the current
code only handles `adValoremPercent`, at minimum: detect specific/compound rates, skip the
percent-of-value math, and flag `Manual review — non-ad-valorem rate` instead of silently
computing a wrong (or zero) amount.

---

## Regression guard for all tasks
Re-run the original clean invoice (cotton t-shirts 6109.10.0012 @16.5% / $8,500, bicycle
frames 8714.91.3000 @3.9% / $42,000) and confirm correct expected amounts
(1,402.50 and 1,638.00) still pass. Add these as fixtures.

## Out of scope / leave alone
- The duty arithmetic (rate × value) itself is correct — don't rewrite it, just feed it the
  right rate.
- HTS normalization (`6109.10.0012.99.88` → `6109.10.00`, space handling, not-found
  detection) works well — preserve it.
