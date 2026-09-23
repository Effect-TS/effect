---
"effect": patch
---

Fix `Stream.forever` and `Stream.repeat` getting slower and holding more memory with every repetition. Each repetition nested another layer that every later pull travelled through, so `n` repetitions cost O(n²) time and kept O(n) memory until the stream ended. Repetitions now run as a loop over one pull, in constant time and memory each.
