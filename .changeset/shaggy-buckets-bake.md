---
"@effect/schema": patch
---

Enums are now exposed under an `enums` property of the schema, closes #2441:

```ts
enum Fruits {
  Apple,
  Banana,
}

// $ExpectType enums<typeof Fruits>
S.enums(Fruits);

// $ExpectType typeof Fruits
S.enums(Fruits).enums;

// $ExpectType Fruits.Apple
S.enums(Fruits).enums.Apple;

// $ExpectType Fruits.Banana
S.enums(Fruits).enums.Banana;
```
