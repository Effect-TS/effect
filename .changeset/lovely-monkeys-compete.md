---
"effect": patch
---

Support for the tacit usage of external handlers for `Match.tag` and `Match.tagStartsWith` functions

```ts
type Value = { _tag: "A"; a: string } | { _tag: "B"; b: number }
const handlerA = (_: { _tag: "A"; a: number }) => _.a

// $ExpectType string | number
pipe(
  M.type<Value>(),
  M.tag("A", handlerA), // <-- no type issue
  M.orElse((_) => _.b)
)(value)
```
