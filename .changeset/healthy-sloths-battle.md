---
"@effect/schema": minor
---

Schema: switch `hashMapFromSelf`, `hashMap` from positional arguments to a single `options` argument:

Before:

```ts
import * as S from "@effect/schema/Schema";

S.hashMapFromSelf(S.string, S.number);
S.hashMap(S.string, S.number);
```

Now:

```ts
import * as S from "@effect/schema/Schema";

S.hashMapFromSelf({ key: S.string, value: S.number });
S.hashMap({ key: S.string, value: S.number });
```
