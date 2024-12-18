---
"@effect/sql-libsql": patch
---

libSQL now requires redacted values instead of strings for:

- `authToken`
- `encryptionKey`

Before

```ts
import { LibsqlClient } from "@effect/sql-libsql"

LibsqlClient.layerConfig({
  url: Config.string("LIBSQL_URL"),
  authToken: Config.string("LIBSQL_AUTH_TOKEN")
})
```

After

```ts
import { LibsqlClient } from "@effect/sql-libsql"
import { Config } from "effect"

LibsqlClient.layerConfig({
  url: Config.string("LIBSQL_URL"),
  authToken: Config.redacted("LIBSQL_AUTH_TOKEN")
})
```
