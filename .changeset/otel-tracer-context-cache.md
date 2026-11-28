---
"@effect/opentelemetry": patch
---

Keep the OpenTelemetry context derived for a span while the active context is unchanged, instead of rebuilding it for every step a fiber takes inside the span, and create a span's attribute map on first use.
