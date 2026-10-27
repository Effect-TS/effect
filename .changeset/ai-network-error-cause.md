---
"effect": patch
---

Keep the cause of a failed HTTP request in the AI `NetworkError` description. An unknown host now reads `TransportError: fetch failed: getaddrinfo ENOTFOUND example.invalid` instead of `TransportError: A network error occurred.`. URLs embedded in the cause and rejected header values are left out of the description.
