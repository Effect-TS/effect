---
"effect": patch
---

Fix RPC request defects breaking SchemaBinary clients. An unknown request tag or a payload decoding failure is now encoded as a complete exit through the protocol codec, so it fails only its own request and the client remains usable.
