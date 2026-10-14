---
"@effect/graphql-generator": patch
---

Emit each object selection, object fragment and input object as a `Schema.Struct` const with an interface of the same name for its decoded type, instead of a `Schema.Opaque` class. The decoded types are unchanged and the generated modules type-check faster.
