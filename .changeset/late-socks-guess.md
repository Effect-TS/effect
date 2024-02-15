---
"effect": minor
---

add support for optional property keys to `pick`, `omit` and `get`

Before:

```ts
import { pipe } from "effect/Function";
import * as S from "effect/Struct";

const struct: {
  a?: string;
  b: number;
  c: boolean;
} = { b: 1, c: true };

// error
const x = pipe(struct, S.pick("a", "b"));

const record: Record<string, number> = {};

const y = pipe(record, S.pick("a", "b"));
console.log(y); // => { a: undefined, b: undefined }

// error
console.log(pipe(struct, S.get("a")));
```

Now

```ts
import { pipe } from "effect/Function";
import * as S from "effect/Struct";

const struct: {
  a?: string;
  b: number;
  c: boolean;
} = { b: 1, c: true };

const x = pipe(struct, S.pick("a", "b"));
console.log(x); // => { b: 1 }

const record: Record<string, number> = {};

const y = pipe(record, S.pick("a", "b"));
console.log(y); // => {}

console.log(pipe(struct, S.get("a"))); // => undefined
```
