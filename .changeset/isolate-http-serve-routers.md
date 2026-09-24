---
"effect": patch
---

Build each HttpRouter entrypoint in a forked layer memo map with a fresh router. This keeps routes on separate servers and handlers isolated while retaining already-built parent services.
