---
"effect": patch
---

Fix `HttpClient.followRedirects` re-encoding the query of the `Location` it follows (`%20` became `+`, `flag` became `flag=`, and invalid UTF-8 bytes were replaced with U+FFFD). The redirected request now uses the resolved `Location` URL without rewriting its query.
