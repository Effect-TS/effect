---
"effect": patch
---

Add opt-in gzip compression to built-in OTLP JSON and protobuf exporters via the compression option or OTEL_EXPORTER_OTLP_COMPRESSION and per-signal environment variables. Compress batches once before retries using HttpClientRequest.compressBody, retaining its default 1KB threshold and uncompressed defaults.
