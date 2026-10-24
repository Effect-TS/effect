---
"effect": patch
---

Redact the SigV4 presigned URL parameters `X-Amz-Signature`, `X-Amz-Credential` and `X-Amz-Security-Token` by default in `UrlParams.CurrentRedactedNames`, as the OpenTelemetry `url.full` conventions list them.
