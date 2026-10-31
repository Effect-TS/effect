---
"effect": patch
---

Preserve the original UTC offset when `DateTime.startOf`, `endOf` and `nearest` round within a repeated hour. Millisecond rounding now leaves the instant unchanged, and sub-day rounding keeps the original offset when it is valid for the rounded wall-clock time.
