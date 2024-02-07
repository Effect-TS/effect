---
"effect": patch
---

add apis for patching runtime flags to the Runtime module

The apis include:

- `Runtime.updateRuntimeFlags` for updating all the flags at once
- `Runtime.enableRuntimeFlag` for enabling a single runtime flag
- `Runtime.disableRuntimeFlag` for disabling a single runtime flag
