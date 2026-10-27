---
"effect": patch
---

Add a `disableFatalDefects` option to `RpcTest.makeClient`, so a handler defect fails only its own request instead of every pending request on the client.
