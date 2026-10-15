---
"effect": patch
---

Allow absolute HTTP URLs in opaque-origin documents, such as sandboxed srcdoc iframes, by ignoring an invalid inferred base URL. Preserve relative URL resolution when the document provides a valid base.
