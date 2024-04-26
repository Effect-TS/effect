---
"@effect/schema": patch
---

add support for data-last subtype overloads in `compose`

Before

```ts
import { Schema as S } from "@effect/schema"

S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString)) // ts error
S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number))) // ts error
```

Now

```ts
import { Schema as S } from "@effect/schema"

// $ExpectType Schema<number, string | null, never>
S.Union(S.Null, S.String).pipe(S.compose(S.NumberFromString)) // ok
// $ExpectType Schema<number | null, string, never>
S.NumberFromString.pipe(S.compose(S.Union(S.Null, S.Number))) // ok
```
