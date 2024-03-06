---
"effect": patch
---

Make sure Effect.Tag works on primitives.

This change allows the following to work just fine:

```ts
import { Effect, Layer } from "effect";

class DateTag extends Effect.Tag("DateTag")<DateTag, Date>() {
  static date = new Date(1970, 1, 1);
  static Live = Layer.succeed(this, this.date);
}

class MapTag extends Effect.Tag("MapTag")<MapTag, Map<string, string>>() {
  static Live = Layer.effect(
    this,
    Effect.sync(() => new Map())
  );
}

class NumberTag extends Effect.Tag("NumberTag")<NumberTag, number>() {
  static Live = Layer.succeed(this, 100);
}
```
