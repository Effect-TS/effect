---
"effect": patch
---

Add `succeedEffect`, `failEffect`, and `verifyRoundTripEffect` to `TestSchema` so assertions can use the calling Effect's services, test clock, and interruption, and mark the module and its public APIs as unstable. Preserve defects and interruption when they occur alongside schema validation failures. Rename `verifyLosslessTransformation` to `verifyRoundTrip`; existing callers must update to the new name.
