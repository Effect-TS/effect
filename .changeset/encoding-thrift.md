---
"effect": patch
---

Add `effect/encoding/Thrift` for reading and writing the Apache Thrift compact protocol without an IDL. The reader is a bounds-checked cursor that reads binary values without copying, and `decode` returns a `Result`. The writer produces the same bytes as the official Thrift library.
