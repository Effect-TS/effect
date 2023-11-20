import * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Runtime from "@effect/platform-node/Runtime"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

const command = Command.standard("foo", {
  options: Options.keyValueMap("flag")
})

const app = CliApp.make({
  name: "Test",
  version: "1.0.0",
  command
})

const program = Effect.sync(() => process.argv.slice(2)).pipe(
  Effect.flatMap((args) =>
    CliApp.run(
      app,
      args,
      (parsed) => Console.dir(Array.from(parsed.options), { depth: null, colors: true })
    )
  )
)

program.pipe(
  Effect.provide(NodeContext.layer),
  Runtime.runMain
)
