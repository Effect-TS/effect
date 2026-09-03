---
"effect": patch
---

Include client codec services in the requirements of `EntityProxyServer.layerHttpApi` and `EntityProxyServer.layerRpcHandlers`, while retaining their server codec requirements.

This intentionally tightens compile-time checking: previously accepted callers must now provide any payload-encoding, success-decoding, and error-decoding services already needed by the entity client at runtime. Provide these services to the proxy handler layer; service-free codecs need no changes. Runtime behavior is unchanged.
