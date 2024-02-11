---
"effect": patch
---

Expand Either and Option `andThen` to support the `map` case like Effects' `andThen`

For example:

```ts
expect(pipe(Either.right(1), Either.andThen(2))).toStrictEqual(Either.right(2))
expect(pipe(Either.right(1), Either.andThen(() => 2))).toStrictEqual(Either.right(2))

expect(pipe(Option.some(1), Option.andThen(2))).toStrictEqual(Option.some(2))
expect(pipe(Option.some(1), Option.andThen(() => 2))).toStrictEqual(Option.some(2))
```
