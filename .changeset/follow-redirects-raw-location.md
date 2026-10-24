---
"effect": patch
---

Fix `HttpClient.followRedirects` re-encoding the query of the `Location` it follows (`%20` became `+`, `flag` became `flag=`, non UTF-8 bytes were lost). The redirected request now uses the URL as the server sent it.
