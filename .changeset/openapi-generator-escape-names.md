---
"@effect/openapi-generator": patch
---

Fix generated clients failing to compile or run when a spec has parameter names or operation paths containing quotes, or non-status keys such as `x-` extensions under `responses`. Names are now escaped, and response keys that aren't a status code, status range or `default` are skipped.
