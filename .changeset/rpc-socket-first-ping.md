---
"effect": patch
---

Fix RPC socket clients closing healthy connections before sending a ping when a ping tick runs late. Slow requests now stay connected while the server responds to pings.
