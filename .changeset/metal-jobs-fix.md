---
"effect": patch
---

Schema: Enforce Finite Durations in `DurationFromNanos`.

This update ensures that `DurationFromNanos` only accepts finite durations. Previously, the schema did not explicitly enforce this constraint.

A filter has been added to validate that the duration is finite.

```diff
DurationFromSelf
+.pipe(
+  filter((duration) => duration_.isFinite(duration), {
+    description: "a finite duration"
+  })
)
```
