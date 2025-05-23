---
"effect": minor
---

The `Config.port` and `Config.branded` functions have been added.

```ts
import { Brand, Config } from "effect"

type DbPort = Brand.Branded<number, "DbPort">
const DbPort = Brand.nominal<DbPort>()

const dbPort: Config.Config<DbPort> = Config.branded(
  Config.port("DB_PORT"),
  DbPort
)
```

```ts
import { Brand, Config } from "effect"

type Port = Brand.Branded<number, "Port">
const Port = Brand.refined<Port>(
  (num) =>
    !Number.isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 65535,
  (n) => Brand.error(`Expected ${n} to be an TCP port`)
)

const dbPort: Config.Config<Port> = Config.number("DB_PORT").pipe(
  Config.branded(Port)
)
```
