---
"effect": patch
---

Add `Config.withBrand` for branding parsed config values, either with a brand key (type-level only) or with a `Brand.Constructor` whose checks validate the parsed value.

```ts
import { Brand, Config } from "effect"

type PoolSize = number & Brand.Brand<"PoolSize">
const PoolSize = Brand.make<PoolSize>((n) => n >= 1 && n <= 100)

const poolSize = Config.Int("POOL_SIZE").pipe(Config.withBrand(PoolSize)) // Config<PoolSize>
const userId = Config.String("USER_ID").pipe(Config.withBrand("UserId")) // Config<string & Brand<"UserId">>
```

Add `Config.withNewtype` for wrapping parsed config values in a `Newtype`, either at the type level with `withNewtype<N>()` or with an `Optic.Iso` such as `Newtype.makeIso`. In both forms the newtype's carrier must match the config value.

```ts
import { Config, Newtype } from "effect"

interface UserId extends Newtype.Newtype<"UserId", string> {}
const UserId = Newtype.makeIso<UserId>()

const userId = Config.String("USER_ID").pipe(Config.withNewtype(UserId)) // Config<UserId>

const userId = Config.String("USER_ID_2").pipe(Config.withNewtype<UserId>())) // Config<UserId>
```
