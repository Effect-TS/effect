// The etest CLI. Runs on Node, Bun or Deno: the platform is picked from the runtime we are on.
import * as Command from "effect/cli/Command"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import PackageJson from "../../package.json" with { type: "json" }
import { command, Executors } from "./Cli.ts"
import { Output } from "./Output.ts"
import { makePlatforms } from "./Platform.ts"
import { serveCommand } from "./Server.ts"

const platforms = makePlatforms({
  node: () => import("./platform/node.ts"),
  bun: () => import("./platform/bun.ts"),
  deno: () => import("./platform/deno.ts")
})

const cli = command.pipe(Command.withSubcommands([serveCommand(PackageJson.version)]))

// on a usage error, print the error and a hint to use --help rather than the whole help
platforms.run(
  Command.run(cli, { version: PackageJson.version, helpOnError: false }).pipe(
    Effect.provide(Layer.mergeAll(Output.process, Executors.fresh))
  )
)
