import * as Args from "@effect/cli/Args"
import * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Runtime from "@effect/platform-node/Runtime"
import * as Console from "effect/Console"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import type * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"

// =============================================================================
// Models
// =============================================================================

type Subcommand = AddSubcommand | CloneSubcommand

interface AddSubcommand extends Data.Case {
  readonly _tag: "AddSubcommand"
  readonly verbose: boolean
}
const AddSubcommand = Data.tagged<AddSubcommand>("AddSubcommand")

interface CloneSubcommand extends Data.Case {
  readonly _tag: "CloneSubcommand"
  readonly depth: Option.Option<number>
  readonly repository: string
  readonly directory: Option.Option<string>
}
const CloneSubcommand = Data.tagged<CloneSubcommand>("CloneSubcommand")

// =============================================================================
// Commands
// =============================================================================

// minigit [--version] [-h | --help] [-c <name>=<value>]
const minigitOptions = Options.keyValueMap("c").pipe(Options.optional)
const minigit = Command.standard("minigit", { options: minigitOptions })

// minigit add   [-v | --verbose] [--] [<pathspec>...]
const minigitAddOptions = Options.boolean("verbose").pipe(Options.withAlias("v"))
const minigitAdd = Command.standard("add", { options: minigitAddOptions }).pipe(
  Command.map((parsed) => AddSubcommand({ verbose: parsed.options }))
)

// minigit clone [--depth <depth>] [--] <repository> [<directory>]
const minigitCloneArgs = Args.all([
  Args.text({ name: "repository" }),
  Args.directory().pipe(Args.optional)
])
const minigitCloneOptions = Options.integer("depth").pipe(Options.optional)
const minigitClone = Command.standard("clone", {
  options: minigitCloneOptions,
  args: minigitCloneArgs
}).pipe(Command.map((parsed) =>
  CloneSubcommand({
    depth: parsed.options,
    repository: parsed.args[0],
    directory: parsed.args[1]
  })
))

const finalCommand = minigit.pipe(Command.withSubcommands([minigitAdd, minigitClone]))

// =============================================================================
// Application
// =============================================================================

const cliApp = CliApp.make({
  name: "MiniGit Distributed Version Control",
  version: "v2.42.1",
  command: finalCommand
})

// =============================================================================
// Execution
// =============================================================================

const handleRootCommand = (configs: Option.Option<HashMap.HashMap<string, string>>) =>
  Option.match(configs, {
    onNone: () => Console.log("Running 'minigit'"),
    onSome: (configs) => {
      const keyValuePairs = Array.from(configs).map(([key, value]) => `${key}=${value}`).join(", ")
      return Console.log(`Running 'minigit' with the following configs: ${keyValuePairs}`)
    }
  })

const handleSubcommand = (subcommand: Subcommand) => {
  switch (subcommand._tag) {
    case "AddSubcommand": {
      return Console.log(`Running 'minigit add' with '--verbose ${subcommand.verbose}'`)
    }
    case "CloneSubcommand": {
      const optionsAndArgs = pipe(
        ReadonlyArray.compact([
          Option.map(subcommand.depth, (depth) => `--depth ${depth}`),
          Option.some(subcommand.repository),
          subcommand.directory
        ]),
        ReadonlyArray.join(", ")
      )
      return Console.log(
        `Running 'minigit clone' with the following options and arguments: '${optionsAndArgs}'`
      )
    }
  }
}

const program = Effect.gen(function*(_) {
  const args = yield* _(Effect.sync(() => globalThis.process.argv.slice(2)))
  return yield* _(CliApp.run(cliApp, args, (parsed) =>
    Option.match(parsed.subcommand, {
      onNone: () => handleRootCommand(parsed.options),
      onSome: (subcommand) => handleSubcommand(subcommand)
    })))
})

program.pipe(
  Effect.provide(NodeContext.layer),
  Runtime.runMain
)
