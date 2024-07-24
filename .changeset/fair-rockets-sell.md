---
"@effect/cli": patch
---

The `Prompt.all` method now supports taking in a record of `Prompt`s to be more
consistent with other `all` APIs throughout the Effect ecosystem.

You can now do:

```ts
import * as Prompt from "@effect/cli/Prompt"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Runtime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"

const program = Prompt.all({
  username: Prompt.text({
    message: "Enter your username"
  }),
  password: Prompt.password({
    message: "Enter your password: ",
    validate: (value) =>
      value.length === 0
        ? Effect.fail("Password cannot be empty")
        : Effect.succeed(value)
  })
})

program.pipe(
  Effect.flatMap(({ username, password }) => /* Your logic here */ ),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
```


