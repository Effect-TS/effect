import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Runtime from "@effect/platform-node/Runtime"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"

// minigit [--version] [-h | --help] [-c <name>=<value>]
const minigit = Command.make(
  "minigit",
  { configs: Options.keyValueMap("c").pipe(Options.optional) },
  ({ configs }) =>
    Option.match(configs, {
      onNone: () => Console.log("Running 'minigit'"),
      onSome: (configs) => {
        const keyValuePairs = Array.from(configs).map(([key, value]) => `${key}=${value}`).join(
          ", "
        )
        return Console.log(`Running 'minigit' with the following configs: ${keyValuePairs}`)
      }
    })
)

const configsString = Effect.map(
  minigit,
  ({ configs }) =>
    Option.match(configs, {
      onNone: () => "",
      onSome: (configs) => {
        const keyValuePairs = Array.from(configs).map(([key, value]) => `${key}=${value}`).join(
          ", "
        )
        return ` with the following configs: ${keyValuePairs}`
      }
    })
)

// minigit add   [-v | --verbose] [--] [<pathspec>...]
const minigitAdd = Command.make("add", {
  verbose: Options.boolean("verbose").pipe(Options.withAlias("v"))
}, ({ verbose }) =>
  Effect.gen(function*(_) {
    const configs = yield* _(configsString)
    yield* _(Console.log(`Running 'minigit add' with '--verbose ${verbose}'${configs}`))
  }))

// minigit clone [--depth <depth>] [--] <repository> [<directory>]
const minigitClone = Command.make("clone", {
  repository: Args.text({ name: "repository" }),
  directory: Args.directory().pipe(Args.optional),
  depth: Options.integer("depth").pipe(Options.optional)
}, ({ depth, directory, repository }) => {
  const optionsAndArgs = pipe(
    ReadonlyArray.getSomes([
      Option.map(depth, (depth) => `--depth ${depth}`),
      Option.some(repository),
      directory
    ]),
    ReadonlyArray.join(", ")
  )
  return Console.log(
    `Running 'minigit clone' with the following options and arguments: '${optionsAndArgs}'`
  )
})

const finalCommand = minigit.pipe(Command.withSubcommands([minigitAdd, minigitClone]))

// =============================================================================
// Application
// =============================================================================

const run = Command.run(finalCommand, {
  name: "MiniGit Distributed Version Control",
  version: "v2.42.1"
})

Effect.suspend(() => run(process.argv.slice(2))).pipe(
  Effect.provide(NodeContext.layer),
  Runtime.runMain
)
