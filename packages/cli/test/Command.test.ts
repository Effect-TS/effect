import { Args, Command, Options } from "@effect/cli"
import { NodeContext } from "@effect/platform-node"
import { Config, ConfigProvider, Context, Effect, Layer } from "effect"
import { assert, describe, it } from "vitest"

const git = Command.make("git", {
  verbose: Options.boolean("verbose").pipe(
    Options.withAlias("v"),
    Options.withFallbackConfig(Config.boolean("VERBOSE"))
  )
}).pipe(Command.withDescription("the stupid content tracker"))

const clone = Command.make("clone", {
  repository: Args.text({ name: "repository" }).pipe(
    Args.withFallbackConfig(Config.string("REPOSITORY"))
  )
}, ({ repository }) =>
  Effect.gen(function*(_) {
    const { log } = yield* _(Messages)
    const { verbose } = yield* _(git)
    if (verbose) {
      yield* _(log(`Cloning ${repository}`))
    } else {
      yield* _(log(`Cloning`))
    }
  })).pipe(Command.withDescription("Clone a repository into a new directory"))

const add = Command.make("add", {
  pathspec: Args.text({ name: "pathspec" })
}, ({ pathspec }) =>
  Effect.gen(function*(_) {
    const { log } = yield* _(Messages)
    const { verbose } = yield* _(git)
    if (verbose) {
      yield* _(log(`Adding ${pathspec}`))
    } else {
      yield* _(log(`Adding`))
    }
  })).pipe(Command.withDescription("Add file contents to the index"))

const run = git.pipe(
  Command.withSubcommands([clone, add]),
  Command.run({
    name: "git",
    version: "1.0.0"
  })
)

describe("Command", () => {
  describe("git", () => {
    it("no sub-command", () =>
      Effect.gen(function*(_) {
        const messages = yield* _(Messages)
        yield* _(run(["--verbose"]))
        yield* _(run([]))
        assert.deepStrictEqual(yield* _(messages.messages), [])
      }).pipe(Effect.provide(EnvLive), Effect.runPromise))

    it("add", () =>
      Effect.gen(function*(_) {
        const messages = yield* _(Messages)
        yield* _(run(["add", "file"]))
        yield* _(run(["--verbose", "add", "file"]))
        assert.deepStrictEqual(yield* _(messages.messages), [
          "Adding",
          "Adding file"
        ])
      }).pipe(Effect.provide(EnvLive), Effect.runPromise))

    it("clone", () =>
      Effect.gen(function*(_) {
        const messages = yield* _(Messages)
        yield* _(run(["clone", "repo"]))
        yield* _(run(["--verbose", "clone", "repo"]))
        assert.deepStrictEqual(yield* _(messages.messages), [
          "Cloning",
          "Cloning repo"
        ])
      }).pipe(Effect.provide(EnvLive), Effect.runPromise))

    it("withFallbackConfig Options boolean", () =>
      Effect.gen(function*(_) {
        const messages = yield* _(Messages)
        yield* _(run(["clone", "repo"]))
        assert.deepStrictEqual(yield* _(messages.messages), [
          "Cloning repo"
        ])
      }).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(
          new Map([["VERBOSE", "true"]])
        )),
        Effect.provide(EnvLive),
        Effect.runPromise
      ))

    it("withFallbackConfig Args", () =>
      Effect.gen(function*(_) {
        const messages = yield* _(Messages)
        yield* _(run(["clone"]))
        assert.deepStrictEqual(yield* _(messages.messages), [
          "Cloning repo"
        ])
      }).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(
          new Map([["VERBOSE", "true"], ["REPOSITORY", "repo"]])
        )),
        Effect.provide(EnvLive),
        Effect.runPromise
      ))
  })
})

// --

interface Messages {
  readonly log: (message: string) => Effect.Effect<never, never, void>
  readonly messages: Effect.Effect<never, never, ReadonlyArray<string>>
}
const Messages = Context.Tag<Messages>()
const MessagesLive = Layer.sync(Messages, () => {
  const messages: Array<string> = []
  return Messages.of({
    log: (message) => Effect.sync(() => messages.push(message)),
    messages: Effect.sync(() => messages)
  })
})
const EnvLive = Layer.mergeAll(MessagesLive, NodeContext.layer)
