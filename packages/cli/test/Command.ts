import * as Args from "@effect/cli/Args"
import * as CliConfig from "@effect/cli/CliConfig"
import * as Command from "@effect/cli/Command"
import * as CommandDirective from "@effect/cli/CommandDirective"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as Span from "@effect/cli/HelpDoc/Span"
import * as Options from "@effect/cli/Options"
import * as it from "@effect/cli/test/utils/extend"
import * as Grep from "@effect/cli/test/utils/grep"
import * as Tail from "@effect/cli/test/utils/tail"
import * as WC from "@effect/cli/test/utils/wc"
import * as ValidationError from "@effect/cli/ValidationError"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import { describe, expect } from "vitest"

describe.concurrent("Command", () => {
  it.effect("validates a command with options followed by args", () =>
    Effect.gen(function*($) {
      const config = CliConfig.defaultConfig
      const args1 = ["tail", "-n", "100", "foo.log"]
      const args2 = ["grep", "--after", "2", "--before", "3", "fooBar"]
      const result1 = yield* $(Command.parse(Tail.command, args1, config))
      const result2 = yield* $(Command.parse(Grep.command, args2, config))
      const expected1 = { name: "tail", options: 100, args: "foo.log" }
      const expected2 = { name: "grep", options: [2, 3], args: "fooBar" }
      expect(result1).toEqual(CommandDirective.userDefined([], expected1))
      expect(result2).toEqual(CommandDirective.userDefined([], expected2))
    }))

  it.effect("provides auto-correct suggestions for misspelled options", () =>
    Effect.gen(function*($) {
      const config = CliConfig.defaultConfig
      const args1 = ["grep", "--afte", "2", "--before", "3", "fooBar"]
      const args2 = ["grep", "--after", "2", "--efore", "3", "fooBar"]
      const args3 = ["grep", "--afte", "2", "--efore", "3", "fooBar"]
      const result1 = yield* $(Effect.flip(Command.parse(Grep.command, args1, config)))
      const result2 = yield* $(Effect.flip(Command.parse(Grep.command, args2, config)))
      const result3 = yield* $(Effect.flip(Command.parse(Grep.command, args3, config)))
      expect(result1).toEqual(ValidationError.invalidValue(HelpDoc.p(Span.error(
        "The flag '--afte' is not recognized. Did you mean '--after'?"
      ))))
      expect(result2).toEqual(ValidationError.invalidValue(HelpDoc.p(Span.error(
        "The flag '--efore' is not recognized. Did you mean '--before'?"
      ))))
      expect(result3).toEqual(ValidationError.missingValue(HelpDoc.sequence(
        HelpDoc.p(Span.error("The flag '--afte' is not recognized. Did you mean '--after'?")),
        HelpDoc.p(Span.error("The flag '--efore' is not recognized. Did you mean '--before'?"))
      )))
    }))

  it.effect("shows an error if an option is missing", () =>
    Effect.gen(function*($) {
      const config = CliConfig.defaultConfig
      const args = ["grep", "--a", "2", "--before", "3", "fooBar"]
      const result = yield* $(Effect.flip(Command.parse(Grep.command, args, config)))
      expect(result).toEqual(ValidationError.missingValue(HelpDoc.p(Span.error(
        "Expected to find option: '--after'"
      ))))
    }))

  it.effect("should handle alternative commands", () =>
    Effect.gen(function*($) {
      const config = CliConfig.defaultConfig
      const args = ["log"]
      const command = Command.make("remote").pipe(Command.orElse(Command.make("log")))
      const result = yield* $(Command.parse(command, args, config))
      const expected = { name: "log", options: void 0, args: void 0 }
      expect(result).toEqual(CommandDirective.userDefined([], expected))
    }))

  it.effect("should treat clustered boolean options as un-clustered options", () =>
    Effect.gen(function*($) {
      const config = CliConfig.defaultConfig
      const args1 = ["wc", "-clw", "filename"]
      const args2 = ["wc", "-c", "-l", "-w", "filename"]
      const clustered = yield* $(
        Effect.map(
          Command.parse(WC.command, args1, config),
          CommandDirective.map((result) => ({ ...result, args: Array.from(result.args) }))
        )
      )
      const unclustered = yield* $(
        Effect.map(
          Command.parse(WC.command, args2, config),
          CommandDirective.map((result) => ({ ...result, args: Array.from(result.args) }))
        )
      )
      const expected = CommandDirective.userDefined([], {
        name: "wc",
        options: [true, true, true, false],
        args: ["filename"]
      })
      expect(clustered).toEqual(expected)
      expect(unclustered).toEqual(expected)
    }))

  describe.concurrent("Subcommands - no options or arguments", () => {
    const git = Command.make("git", { options: Options.boolean("verbose").pipe(Options.alias("v")) }).pipe(
      Command.subcommands([Command.make("remote"), Command.make("log")])
    )

    it.effect("matches the top-level command if no subcommands are specified", () =>
      Effect.gen(function*($) {
        const config = CliConfig.defaultConfig
        const args = ["git", "-v"]
        const result = yield* $(Command.parse(git, args, config))
        const expected = { name: "git", options: true, args: void 0, subcommand: Option.none() }
        expect(result).toEqual(CommandDirective.userDefined([], expected))
      }))

    it.effect("matches the first subcommand without any surplus arguments", () =>
      Effect.gen(function*($) {
        const config = CliConfig.defaultConfig
        const args = ["git", "remote"]
        const result = yield* $(Command.parse(git, args, config))
        const expected = {
          name: "git",
          options: false,
          args: void 0,
          subcommand: Option.some({ name: "remote", options: void 0, args: void 0 })
        }
        expect(result).toEqual(CommandDirective.userDefined([], expected))
      }))

    it.effect("matches the first subcommand with a surplus option", () =>
      Effect.gen(function*($) {
        const config = CliConfig.defaultConfig
        const args = ["git", "remote", "-m"]
        const result = yield* $(Command.parse(git, args, config))
        const expected = {
          name: "git",
          options: false,
          args: void 0,
          subcommand: Option.some({ name: "remote", options: void 0, args: void 0 })
        }
        expect(result).toEqual(CommandDirective.userDefined(["-m"], expected))
      }))

    it.effect("matches the second subcommand without any surplus arguments", () =>
      Effect.gen(function*($) {
        const config = CliConfig.defaultConfig
        const args = ["git", "log"]
        const result = yield* $(Command.parse(git, args, config))
        const expected = {
          name: "git",
          options: false,
          args: void 0,
          subcommand: Option.some({ name: "log", options: void 0, args: void 0 })
        }
        expect(result).toEqual(CommandDirective.userDefined([], expected))
      }))
  })

  describe.concurrent("Subcommands - with options and arguments", () => {
    const rebaseOptions = Options.boolean("i").pipe(
      Options.zip(Options.text("empty").pipe(Options.withDefault("drop")))
    )
    const rebaseArgs = Args.zip(Args.text(), Args.text())
    const git = Command.make("git").pipe(
      Command.subcommands([
        Command.make("rebase", { options: rebaseOptions, args: rebaseArgs })
      ])
    )

    it.effect("subcommand with required options and arguments", () =>
      Effect.gen(function*($) {
        const config = CliConfig.defaultConfig
        const args = ["git", "rebase", "-i", "upstream", "branch"]
        const result = yield* $(Command.parse(git, args, config))
        const expected = {
          name: "git",
          options: void 0,
          args: void 0,
          subcommand: Option.some({ name: "rebase", options: [true, "drop"], args: ["upstream", "branch"] })
        }
        expect(result).toEqual(CommandDirective.userDefined([], expected))
      }))

    it.effect("subcommand with required and optional options and arguments", () =>
      Effect.gen(function*($) {
        const config = CliConfig.defaultConfig
        const args = ["git", "rebase", "-i", "--empty", "ask", "upstream", "branch"]
        const result = yield* $(Command.parse(git, args, config))
        const expected = {
          name: "git",
          options: void 0,
          args: void 0,
          subcommand: Option.some({ name: "rebase", options: [true, "ask"], args: ["upstream", "branch"] })
        }
        expect(result).toEqual(CommandDirective.userDefined([], expected))
      }))

    it.effect("subcommand that is unknown", () =>
      Effect.gen(function*($) {
        const git = pipe(
          Command.make("git", { options: Options.alias(Options.boolean("verbose"), "v") }),
          Command.subcommands([
            Command.make("remote", { options: Options.alias(Options.boolean("verbose"), "v") }),
            Command.make("log")
          ])
        )
        const config = CliConfig.defaultConfig
        const args = ["git", "abc"]
        const result = yield* $(Effect.flip(Command.parse(git, args, config)))
        expect(result).toEqual(ValidationError.commandMismatch(HelpDoc.p(Span.error("Missing command name: 'log'"))))
      }))
  })

  describe.concurrent("Subcommands - nested", () => {
    const command = Command.make("command").pipe(
      Command.subcommands([
        Command.make("sub").pipe(
          Command.subcommands([Command.make("subsub", { options: Options.boolean("i"), args: Args.text() })])
        )
      ])
    )

    it.effect("deeply nested subcommands with an option and argument", () =>
      Effect.gen(function*($) {
        const config = CliConfig.defaultConfig
        const args = ["command", "sub", "subsub", "-i", "text"]
        const result = yield* $(Command.parse(command, args, config))
        const expected = {
          name: "command",
          options: void 0,
          args: void 0,
          subcommand: Option.some({
            name: "sub",
            options: void 0,
            args: void 0,
            subcommand: Option.some({
              name: "subsub",
              options: true,
              args: "text"
            })
          })
        }
        expect(result).toEqual(CommandDirective.userDefined([], expected))
      }))
  })
})
