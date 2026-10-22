---
"effect": patch
---

Remove DOM-only `Transferable` and `ImageData` references from the RPC and worker declarations so Node-only projects can type-check imports without the DOM library. Transfer lists now use `Transferable.TransferableObject`, which resolves to the DOM `Transferable` type in browsers and the `worker_threads` `Transferable` type in Node.js.
