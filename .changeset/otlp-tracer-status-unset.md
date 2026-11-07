---
"effect": patch
---

fix(OtlpTracer): leave span status Unset on success instead of setting Ok

OTEL semantic conventions v1.40+ (recording-errors) specify that
instrumentation libraries must not set a span's status to Ok — that
responsibility belongs to application code. Successful spans now carry
StatusCode.Unset (0) rather than StatusCode.Ok (1).
