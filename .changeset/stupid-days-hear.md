---
"effect": patch
---

Schema: Fix `BigIntFromNumber` to enforce upper and lower bounds.

This update ensures the `BigIntFromNumber` schema adheres to safe integer limits by applying the following bounds:

```diff
BigIntFromSelf
+  .pipe(
+    betweenBigInt(
+      BigInt(Number.MIN_SAFE_INTEGER),
+      BigInt(Number.MAX_SAFE_INTEGER)
+    )
+  )
```
