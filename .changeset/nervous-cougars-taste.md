---
"effect": minor
---

add Logger.prettyLogger and Logger.pretty

`Logger.pretty` is a new logger that leverages the features of the `console` APIs to provide a more visually appealing output.

To try it out, provide it to your program:

```ts
import { Effect, Logger } from "effect"

Effect.log("Hello, World!").pipe(Effect.provide(Logger.pretty))
```
