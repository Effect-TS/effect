---
"effect": patch
---

Complete HTTP server spans synchronously before the request fiber exits, preventing completed spans from being lost during immediate runtime shutdown.
