---
"effect": patch
---

Remove DOM-only `Transferable` and `ImageData` references from the RPC and worker declarations so Node-only projects can type-check imports without the DOM library.
