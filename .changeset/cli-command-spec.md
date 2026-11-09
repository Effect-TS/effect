---
"effect": patch
---

Add `CommandSpec`, a lossless projection of an `effect/cli` command path for documentation tooling, plus `Flag.annotate` / `Argument.annotate` / `Param.annotate` for attaching custom metadata to parameters.

```ts
import { Config, Context, Option } from "effect"
import { Command, CommandSpec, Flag } from "effect/cli"

const EnvVar = Context.Service<never, string>("app/EnvVar")

const push = Command.make("push", {
  dbUrl: Flag.String("db-url").pipe(
    Flag.withFallbackConfig(Config.String("DB_URL")),
    Flag.annotate(EnvVar, "DB_URL")
  )
})
const cli = Command.make("app").pipe(Command.withSubcommands([push]))

const spec = Option.getOrThrow(CommandSpec.resolve(cli, ["app", "push"]))
for (const flag of spec.flags) {
  // flag.scope, flag.required, flag.fallbacks, Context.getOption(flag.annotations, EnvVar), ...
}
```
