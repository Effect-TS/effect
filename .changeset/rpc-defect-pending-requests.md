---
"effect": patch
---

Fix RPC connection defects failing new requests started synchronously by pending callers. Only requests pending when defect delivery begins are failed; new requests await their own responses. Ensure all pending calls are released even if defect delivery is interrupted.
