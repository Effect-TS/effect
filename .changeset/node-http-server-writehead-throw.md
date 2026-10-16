---
"@effect/platform-node": patch
---

Fix `NodeHttpServer` leaving a request unanswered when Node rejects the response headers, for example a header value containing a newline or an HTTP/2 connection-specific header. The server now sends a fallback error response, or destroys the response when no fallback can be written, and still reports the failure.
