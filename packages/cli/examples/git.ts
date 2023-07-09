import * as Args from "@effect/cli/Args"
import * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Console from "@effect/cli/Console"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as Span from "@effect/cli/HelpDoc/Span"
import * as Options from "@effect/cli/Options"
import * as Data from "@effect/data/Data"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"

export interface Git extends Data.Case {
  readonly version: boolean
  readonly subcommand: Option.Option<GitSubcommand>
}

export const Git = Data.case<Git>()

export type GitSubcommand = Add | Remote

export type RemoteSubcommand = AddRemote | RemoveRemote

export interface Add extends Data.Case {
  readonly _tag: "Add"
  readonly modified: boolean
  readonly directory: string
}

export const Add = Data.tagged<Add>("Add")

export interface Remote extends Data.Case {
  readonly _tag: "Remote"
  readonly verbose: boolean
  readonly subcommand: Option.Option<RemoteSubcommand>
}

export const Remote = Data.tagged<Remote>("Remote")

export interface AddRemote extends Data.Case {
  readonly _tag: "AddRemote"
  readonly name: string
  readonly url: string
}

export const AddRemote = Data.tagged<AddRemote>("AddRemote")

export interface RemoveRemote extends Data.Case {
  readonly _tag: "RemoveRemote"
  readonly name: string
}

export const RemoveRemote = Data.tagged<RemoveRemote>("RemoveRemote")

const add: Command.Command<GitSubcommand> = pipe(
  Command.make("add", { options: Options.boolean("m"), args: Args.text({ name: "directory" }) }),
  Command.withHelp(HelpDoc.p("Description of the `git add` subcommand")),
  Command.map(({ args: directory, options: modified }) => Add({ modified, directory }))
)

const addRemote: Command.Command<RemoteSubcommand> = pipe(
  Command.make("add", {
    options: Options.all({
      name: Options.text("name"),
      url: Options.text("url")
    })
  }),
  Command.withHelp(HelpDoc.p("Description of the `git remote add` subcommand")),
  Command.map(({ options: { name, url } }) => AddRemote({ name, url }))
)

const removeRemote: Command.Command<RemoteSubcommand> = pipe(
  Command.make("remove", { args: Args.text({ name: "name" }) }),
  Command.withHelp(HelpDoc.p("Description of the `git remote remove` subcommand")),
  Command.map(({ args: name }) => RemoveRemote({ name }))
)

const remote: Command.Command<GitSubcommand> = pipe(
  Command.make("remote", { options: Options.alias(Options.boolean("verbose"), "v") }),
  Command.withHelp("Description of the `git remote` subcommand"),
  Command.subcommands([addRemote, removeRemote]),
  Command.map(({ options: verbose, subcommand }) => Remote({ verbose, subcommand }))
)

const git: Command.Command<Git> = pipe(
  Command.make("git", { options: Options.alias(Options.boolean("version"), "v") }),
  Command.subcommands([add, remote]),
  Command.map(({ options: version, subcommand }) => Git({ version, subcommand }))
)

const handleRemoteSubcomand = (verbose: boolean) =>
  (command: RemoteSubcommand): Effect.Effect<never, never, void> => {
    switch (command._tag) {
      case "AddRemote": {
        const msg = (
          `Executing 'git remote add' with '--name' set to '${command.name}', ` +
          `'--url' set to '${command.url}', and '--verbose' set to ${verbose}`
        )
        return Effect.log(msg)
      }
      case "RemoveRemote": {
        const msg = (
          `Executing 'git remote remove' with '--name' set to '${command.name}', ` +
          `and '--verbose' set to ${verbose}`
        )
        return Effect.log(msg)
      }
    }
  }

const handleGitSubcommand = (command: GitSubcommand): Effect.Effect<never, never, void> => {
  switch (command._tag) {
    case "Add": {
      const msg = `Executing 'git add ${command.directory}' with modified flag set to '${command.modified}'`
      return Effect.log(msg)
    }
    case "Remote": {
      return Option.match(command.subcommand, {
        onNone: () => Effect.log(`Executing 'git remote' with verbose flag set to '${command.verbose}'`),
        onSome: handleRemoteSubcomand(command.verbose)
      })
    }
  }
}

const cli = CliApp.make({
  name: "Git Version Control",
  version: "0.9.2",
  command: git,
  summary: Span.text("a client for the git dvcs protocol"),
  footer: HelpDoc.p("Copyright 2023")
})

pipe(
  Effect.sync(() => process.argv.slice(2)),
  Effect.flatMap((args) =>
    CliApp.run(cli, args, (command) =>
      Option.match(command.subcommand, {
        onNone: () =>
          command.version
            ? Effect.log(`Executing 'git --version'`)
            : Effect.unit,
        onSome: handleGitSubcommand
      }))
  ),
  Effect.provideLayer(Console.layer),
  Effect.runFork
)
