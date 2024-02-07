---
"@effect/schema": minor
---

Schema: switch `exitFromSelf`, `exit` from positional arguments to a single `options` argument:

Before:

```ts
import * as S from "@effect/schema/Schema";

S.exitFromSelf(S.string, S.number);
S.exit(S.string, S.number);
```

Now:

```ts
import * as S from "@effect/schema/Schema";

S.exitFromSelf({ failure: S.string, success: S.number });
S.exit({ failure: S.string, success: S.number });
```
