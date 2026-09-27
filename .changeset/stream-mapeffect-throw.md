---
"effect": patch
---

Fix concurrent `Stream.mapEffect` hanging when the mapping function throws synchronously. Run the function inside its forked fiber so the throw is reported as a defect.
