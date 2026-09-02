---
"@effect/platform-browser": patch
---

Fix text, JSON, and stream body reads when the XHR HTTP client uses `withXHRArrayBuffer` or `CurrentXHRResponseType` is `"arraybuffer"`. Text and JSON readers decode UTF-8, and streams return the response bytes without accessing the text-only XHR response property.
