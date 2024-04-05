---
"@effect/platform": patch
---

add PlatformConfigProvider module

It contains a file tree provider, that can be used to read config values from a file tree.

For example, if you have a file tree like this:

```
config/
  secret
  nested/
    value
```

You could do the following:

```ts
import { PlatformConfigProvider } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Config, Effect, Layer } from "effect";

const ConfigProviderLive = PlatformConfigProvider.layerFileTreeSet({
  rootDirectory: `/config`,
}).pipe(Layer.provide(NodeContext.layer));

Effect.gen(function* (_) {
  const secret = yield* _(Config.secret("secret"));
  const value = yield* _(Config.string("value"), Config.nested("nested"));
}).pipe(Effect.provide(ConfigProviderLive));
```
