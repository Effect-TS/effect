---
"@effect/sql-d1": patch
---

Fix D1 statement `.raw` to return the native `D1Result` object with `success`, `meta`, and `results`, instead of discarding metadata and returning only the row array.

This changes the observable result shape even though the public raw result type remains `unknown`. Callers casting the previous result to an array must use the native result's `.results` property, or use the ordinary statement or `.unprepared` API when only rows are needed.

Normal row results, positional results (`.values` and `.valuesUnprepared`), and their query/result transform behavior are unchanged. `.raw` continues to bypass query and result name transforms.
