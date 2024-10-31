---
"effect": minor
---

`Config.redacted` has been made more flexible and can now wrap any other config. This allows to transform or validate config values before it’s hidden.

```ts
import { Config } from "effect"

Effect.gen(function* () {
  // can be any string including empty
  const pass1 = yield* Config.redacted("PASSWORD")
  //    ^? Redacted<string>

  // can't be empty string
  const pass2 = yield* Config.redacted(Config.nonEmptyString("PASSWORD"))
  //    ^? Redacted<string>

  const pass2 = yield* Config.redacted(Config.number("SECRET_NUMBER"))
  //    ^? Redacted<number>
})
```
