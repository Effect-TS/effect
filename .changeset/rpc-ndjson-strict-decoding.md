---
"effect": minor
---

Change RPC NDJSON's content type from `application/ndjson` to `application/x-ndjson`; update any exact media-type checks in custom integrations. Reject malformed non-empty lines with `RpcSerialization.NdjsonDecodeError` (preserving the parse error as `cause`) instead of silently dropping messages, while explicitly skipping empty LF and CRLF lines. Existing RPC HTTP clients and servers remain compatible across the header change.
