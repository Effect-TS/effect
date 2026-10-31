---
"effect": patch
---

Preserve the original UTC offset when `DateTime.startOf`, `endOf` and `nearest` round within a repeated hour. Sub-day rounding keeps the original offset when it is valid for the rounded wall-clock time, while retaining the existing millisecond precision.
