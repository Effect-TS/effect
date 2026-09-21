---
"effect": patch
---

Extend `NetAddress.toCanonical` to accept internet addresses. IPv4-mapped IPv6 addresses become IPv4 while retaining the port. Other addresses retain their identity and IPv6 scope metadata.
