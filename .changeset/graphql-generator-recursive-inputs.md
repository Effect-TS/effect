---
"@effect/graphql-generator": patch
---

Generate recursive input objects, such as filters with `and` / `or`, instead of reporting them as unsupported. An input object on a cycle is a `Schema.Codec` annotated with written-out Type and Encoded interfaces, and refers to the cycle through `Schema.suspend`.
