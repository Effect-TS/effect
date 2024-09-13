---
"effect": minor
---

add `Logger.withLeveledConsole`

In browsers and different platforms, `console.error` renders differently than `console.info`. This helps to distinguish between different levels of logging. `Logger.withLeveledConsole` takes any logger and calls the respective `Console` method based on the log level. For instance, `Effect.logError` will call `Console.error` and `Effect.logInfo` will call `Console.info`.

To use it, you can replace the default logger with a `Logger.withLeveledConsole` logger:

```ts
import { Logger, Effect } from "effect"

const loggerLayer = Logger.withLeveledConsole(Logger.stringLogger)

Effect.gen(function* () {
  yield* Effect.logError("an error")
  yield* Effect.logInfo("an info")
}).pipe(Effect.provide(loggerLayer))
```
