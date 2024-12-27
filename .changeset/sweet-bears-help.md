---
"effect": patch
---

Avoid putting symbols in global to fix incompatibility with Temporal Sandbox.

After speaking with James Watkins-Harvey we realized current Effect escapes the Temporal Worker sandbox that doesn't look for symbols when restoring global context in the isolate they create leading to memory leaks.
