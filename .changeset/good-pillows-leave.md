---
"effect": patch
---

Improve `Duration.decode` Handling of High-Resolution Time

- **Ensured Immutability**: Added the `readonly` modifier to `[seconds: number, nanos: number]` in `DurationInput` to prevent accidental modifications.
- **Better Edge Case Handling**: Now correctly processes special values like `-Infinity` and `NaN` when they appear in the tuple representation of duration.
