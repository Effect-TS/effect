---
"@effect/platform": patch
---

Add support for `ConfigProvider` based on .env files.

```ts
import { PlatformConfigProvider } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Config } from "effect"

Effect.gen(function* () {
  const config = yield* Config.all({
    api_url: Config.string("API_URL"),
    api_key: Config.string("API_KEY")
  })

  console.log(`Api config: ${config}`)
}).pipe(
  Effect.provide(PlatformConfigProvider.layerDotEnvAdd(".env").pipe(
    Layer.provide(NodeContext.layer)
  )),
)
```
