import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Array, Config, ConfigProvider, Console, Effect, Option } from "effect"

// minigit [--version] [-h | --help] [-c <name>=<value>]
const configs = Options.keyValueMap("c").pipe(Options.optional)
const minigit = Command.make("minigit", { configs }, ({ configs }) =>
  Option.match(configs, {
    onNone: () => Console.log("Running 'minigit'"),
    onSome: (configs) => {
      const keyValuePairs = Array.fromIterable(configs)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")
      return Console.log(`Running 'minigit' with the following configs: ${keyValuePairs}`)
    }
  }))

// minigit add   [-v | --verbose] [--] [<pathspec>...]
const pathspec = Args.text({ name: "pathspec" }).pipe(Args.repeated)
const verbose = Options.boolean("verbose").pipe(
  Options.withAlias("v"),
  Options.withFallbackConfig(Config.boolean("VERBOSE"))
)
const minigitAdd = Command.make("add", { pathspec, verbose }, ({ pathspec, verbose }) => {
  const paths = Array.match(pathspec, {
    onEmpty: () => "",
    onNonEmpty: (paths) => ` ${Array.join(paths, " ")}`
  })
  return Console.log(`Running 'minigit add${paths}' with '--verbose ${verbose}'`)
})

// minigit clone [--depth <depth>] [--] <repository> [<directory>]
const repository = Args.text({ name: "repository" })
const directory = Args.directory().pipe(Args.optional)
const depth = Options.integer("depth").pipe(
  Options.withFallbackConfig(Config.integer("DEPTH")),
  Options.optional
)
const minigitClone = Command.make(
  "clone",
  { repository, directory, depth },
  (subcommandConfig) =>
    Effect.flatMap(minigit, (parentConfig) => {
      const depth = Option.map(subcommandConfig.depth, (depth) => `--depth ${depth}`)
      const repository = Option.some(subcommandConfig.repository)
      const optionsAndArgs = Array.getSomes([depth, repository, subcommandConfig.directory])
      const configs = Option.match(parentConfig.configs, {
        onNone: () => "",
        onSome: (map) => Array.fromIterable(map).map(([key, value]) => `${key}=${value}`).join(", ")
      })
      return Console.log(
        "Running 'minigit clone' with the following options and arguments: " +
          `'${Array.join(optionsAndArgs, ", ")}'\n` +
          `and the following configuration parameters: ${configs}`
      )
    })
)

const command = minigit.pipe(Command.withSubcommands([minigitAdd, minigitClone]))

const cli = Command.run(command, {
  name: "Minigit Distributed Version Control",
  version: "v1.0.0"
})

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.withConfigProvider(ConfigProvider.nested(ConfigProvider.fromEnv(), "GIT")),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
