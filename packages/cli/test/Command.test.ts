import { Args, Command, Options } from "@effect/cli"
import { NodeContext } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Config, ConfigProvider, Context, Effect, Layer } from "effect"

const git = Command.make("git", {
  verbose: Options.boolean("verbose").pipe(
    Options.withAlias("v"),
    Options.withFallbackConfig(Config.boolean("VERBOSE"))
  )
}).pipe(
  Command.withDescription("the stupid content tracker"),
  Command.provideEffectDiscard(() =>
    Effect.flatMap(
      Messages,
      (_) => _.log("shared")
    )
  )
)

const clone = Command.make("clone", {
  repository: Args.text({ name: "repository" }).pipe(
    Args.withFallbackConfig(Config.string("REPOSITORY"))
  )
}, ({ repository }) =>
  Effect.gen(function*() {
    const { log } = yield* Messages
    const { verbose } = yield* git
    if (verbose) {
      yield* log(`Cloning ${repository}`)
    } else {
      yield* log("Cloning")
    }
  })).pipe(Command.withDescription("Clone a repository into a new directory"))

const AddService = Context.GenericTag<"AddService">("AddService")

const add = Command.make("add", {
  pathspec: Args.text({ name: "pathspec" })
}).pipe(
  Command.withHandler(({ pathspec }) =>
    Effect.gen(function*() {
      yield* AddService
      const { log } = yield* Messages
      const { verbose } = yield* git
      if (verbose) {
        yield* log(`Adding ${pathspec}`)
      } else {
        yield* log(`Adding`)
      }
    })
  ),
  Command.withDescription("Add file contents to the index"),
  Command.provideEffect(AddService, (_) => Effect.succeed("AddService" as const))
)

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
      Effect.gen(function*() {
        const messages = yield* Messages
        yield* run(["--verbose"])
        yield* run([])
        assert.deepStrictEqual(yield* messages.messages, ["shared", "shared"])
      }).pipe(Effect.provide(EnvLive), Effect.runPromise))

    it("add", () =>
      Effect.gen(function*() {
        const messages = yield* Messages
        yield* run(["node", "git.js", "add", "file"])
        yield* run(["node", "git.js", "--verbose", "add", "file"])
        assert.deepStrictEqual(yield* messages.messages, [
          "shared",
          "Adding",
          "shared",
          "Adding file"
        ])
      }).pipe(Effect.provide(EnvLive), Effect.runPromise))

    it("clone", () =>
      Effect.gen(function*() {
        const messages = yield* Messages
        yield* run(["node", "git.js", "clone", "repo"])
        yield* run(["node", "git.js", "--verbose", "clone", "repo"])
        assert.deepStrictEqual(yield* messages.messages, [
          "shared",
          "Cloning",
          "shared",
          "Cloning repo"
        ])
      }).pipe(Effect.provide(EnvLive), Effect.runPromise))

    it("withFallbackConfig Options boolean", () =>
      Effect.gen(function*() {
        const messages = yield* Messages
        yield* run(["node", "git.js", "clone", "repo"])
        assert.deepStrictEqual(yield* messages.messages, [
          "shared",
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
      Effect.gen(function*() {
        const messages = yield* Messages
        yield* run(["node", "git.js", "clone"])
        assert.deepStrictEqual(yield* messages.messages, [
          "shared",
          "Cloning repo"
        ])
      }).pipe(
        Effect.withConfigProvider(ConfigProvider.fromMap(
          new Map([["VERBOSE", "true"], ["REPOSITORY", "repo"]])
        )),
        Effect.provide(EnvLive),
        Effect.runPromise
      ))

    it("options after positional args", () =>
      Effect.gen(function*() {
        const messages = yield* Messages
        // --verbose after the positional arg "repo"
        yield* run(["node", "git.js", "clone", "repo", "--verbose"])
        assert.deepStrictEqual(yield* messages.messages, [
          "shared",
          "Cloning repo"
        ])
      }).pipe(Effect.provide(EnvLive), Effect.runPromise))

    it("options after positional args with alias", () =>
      Effect.gen(function*() {
        const messages = yield* Messages
        // -v after the positional arg "repo"
        yield* run(["node", "git.js", "clone", "repo", "-v"])
        assert.deepStrictEqual(yield* messages.messages, [
          "shared",
          "Cloning repo"
        ])
      }).pipe(Effect.provide(EnvLive), Effect.runPromise))
  })
})

// --

interface Messages {
  readonly log: (message: string) => Effect.Effect<void>
  readonly messages: Effect.Effect<ReadonlyArray<string>>
}
const Messages = Context.GenericTag<Messages>("Messages")
const MessagesLive = Layer.sync(Messages, () => {
  const messages: Array<string> = []
  return Messages.of({
    log: (message) => Effect.sync(() => messages.push(message)),
    messages: Effect.sync(() => messages)
  })
})
const EnvLive = Layer.mergeAll(MessagesLive, NodeContext.layer)
