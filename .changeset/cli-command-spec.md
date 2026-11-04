---
"effect": patch
---

Add `CommandSpec`, a lossless projection of an `effect/cli` command path for documentation tooling, plus `Flag.annotate` / `Argument.annotate` / `Param.annotate` for attaching custom metadata to parameters.

`CommandSpec.resolve` reads a command tree without running handlers, prompts, `Config` or effectful defaults. Unlike `Completions.fromCommand`, it keeps hidden flags and unlisted subcommands (marked as such), reports where every effective flag comes from (local, inherited through `withSharedFlags`, or global including built-ins), exposes the full primitive type, `withMetavar` overrides, aliases, negation, requiredness, variadic bounds and the fallbacks a parameter has (`Default` with its value, `DefaultEffect`, `Config`, `Prompt`), and resolves examples for the requested path.

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
