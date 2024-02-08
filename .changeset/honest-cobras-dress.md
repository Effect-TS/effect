---
"@effect/schema": minor
---

Schema: switch `causeFromSelf`, `cause` from positional arguments to a single `options` argument:

Before:

```ts
import * as S from "@effect/schema/Schema";

S.causeFromSelf(S.string);
S.causeFromSelf(S.string, S.unknown);
S.cause(S.string);
S.cause(S.string, S.unknown);
```

Now:

```ts
import * as S from "@effect/schema/Schema";

S.causeFromSelf({ error: S.string });
S.causeFromSelf({ error: S.string, defect: S.unknown });
S.cause({ error: S.string });
S.cause({ error: S.string, defect: S.unknown });
```
