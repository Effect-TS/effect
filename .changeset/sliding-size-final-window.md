---
"effect": patch
---

Fix `Stream.slidingSize` dropping elements from the final partial window when the step is smaller than the window size, for example `[1, 2, 3, 4, 5, 6]` with `slidingSize(3, 2)` now ends with `[5, 6]` instead of `[6]`.
