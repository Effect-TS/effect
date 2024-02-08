---
"@effect/schema": minor
---

Schema: switch `readonlyMapFromSelf`, `readonlyMap` from positional arguments to a single `options` argument:

Before:

```ts
import * as S from "@effect/schema/Schema";

S.readonlyMapFromSelf(S.string, S.number);
S.readonlyMap(S.string, S.number);
```

Now:

```ts
import * as S from "@effect/schema/Schema";

S.readonlyMapFromSelf({ key: S.string, value: S.number });
S.readonlyMap({ key: S.string, value: S.number });
```
