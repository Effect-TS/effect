---
"effect": patch
---

Match `AtomHttpApi` query and mutation success types to the generated HTTP client, including SSE, binary streams, and header-wrapped responses. Stream transport, decoding, and SSE errors remain inside the returned stream rather than the outer atom error type.

Query response-mode inference is unchanged: nondefault query modes may still require explicit public generic arguments. Runtime and serialization behavior are unchanged.
