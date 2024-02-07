---
"@effect/schema": minor
---

Schema: switch `eitherFromSelf`, `either`, `eitherFromUnion` from positional arguments to a single `options` argument:

Before:

```ts
import * as S from "@effect/schema/Schema";

S.eitherFromSelf(S.string, S.number);
S.either(S.string, S.number);
S.eitherFromUnion(S.string, S.number);
```

Now:

```ts
import * as S from "@effect/schema/Schema";

S.eitherFromSelf({ left: S.string, right: S.number });
S.either({ left: S.string, right: S.number });
S.eitherFromUnion({ left: S.string, right: S.number });
```
