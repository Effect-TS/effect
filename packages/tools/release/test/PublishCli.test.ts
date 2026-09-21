import { cli } from "@effect/release"
import { Publication, type PublishOptions, type ReadinessOptions } from "@effect/release/Publication"
import { Release } from "@effect/release/Release"
import { assert, describe, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Redacted from "effect/Redacted"
import * as Stdio from "effect/Stdio"
import * as Terminal from "effect/Terminal"
import { TestConsole } from "effect/testing"
import * as CliOutput from "effect/unstable/cli/CliOutput"
import * as Command from "effect/unstable/cli/Command"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import { LEDGER_SHA } from "./utils.ts"

const cliEnvironment = (env: Record<string, string>) =>
  Layer.mergeAll(
    FileSystem.layerNoop({}),
    Path.layer,
    Layer.succeed(
      ChildProcessSpawner.ChildProcessSpawner,
      ChildProcessSpawner.make(() => Effect.die("no child processes in these tests"))
    ),
    Stdio.layerTest({}),
    TestConsole.layer,
    CliOutput.layer(CliOutput.defaultFormatter({ colors: false })),
    ConfigProvider.layer(ConfigProvider.fromEnv({ env })),
    Layer.succeed(
      Terminal.Terminal,
      Terminal.make({
        columns: Effect.succeed(80),
        rows: Effect.succeed(24),
        readInput: Effect.die("unused"),
        readLine: Effect.die("unused"),
        display: () => Effect.void
      })
    )
  )

/** Records what the CLI asks the orchestrator for; the orchestrator itself is tested separately. */
const appLayer = (env: Record<string, string>) => {
  const readinessCalls: Array<ReadinessOptions> = []
  const publishCalls: Array<{ readonly expectedIdentity: string; readonly otp: string; readonly dryRun: boolean }> = []
  const layer = Layer.mergeAll(
    Layer.succeed(
      Publication,
      Publication.of({
        readiness: (options) =>
          Effect.sync(() => {
            readinessCalls.push(options)
            return { _tag: "Idle", reason: "nothing staged" } as const
          }),
        publish: (options: PublishOptions) =>
          Effect.sync(() => {
            publishCalls.push({
              expectedIdentity: options.expectedIdentity,
              otp: Redacted.value(options.otp),
              dryRun: options.dryRun === true
            })
            return {
              _tag: "AlreadyPublished",
              identity: options.expectedIdentity,
              websiteRevision: LEDGER_SHA
            } as const
          })
      })
    ),
    Layer.succeed(
      Release,
      Release.of({
        plan: Effect.die("unused"),
        route: Effect.die("unused"),
        run: () => Effect.die("unused")
      })
    )
  ).pipe(Layer.provideMerge(cliEnvironment(env)))
  return { readinessCalls, publishCalls, layer }
}

const run = (args: ReadonlyArray<string>) => Command.runWith(cli, { version: "0.0.0", renderErrors: false })(args)

describe("release readiness", () => {
  it.effect("assesses the queue for the given tag and prints the result as JSON", () =>
    Effect.gen(function*() {
      const { layer, readinessCalls } = appLayer({})
      yield* run(["readiness", "--tag", "rc"]).pipe(Effect.provide(layer))
      assert.deepStrictEqual(readinessCalls, [{ tag: "rc", dryRun: false }])
      const printed = JSON.parse((yield* TestConsole.logLines).join("\n")) as { _tag: string }
      assert.strictEqual(printed._tag, "Idle")
    }))

  it.effect("passes --dry-run through", () =>
    Effect.gen(function*() {
      const { layer, readinessCalls } = appLayer({})
      yield* run(["readiness", "--tag", "rc", "--dry-run"]).pipe(Effect.provide(layer))
      assert.deepStrictEqual(readinessCalls, [{ tag: "rc", dryRun: true }])
    }))

  it.effect("requires --tag", () =>
    Effect.gen(function*() {
      const { layer, readinessCalls } = appLayer({})
      const error = yield* Effect.flip(run(["readiness"]).pipe(Effect.provide(layer)))
      assert.notStrictEqual((error as { _tag: string })._tag, "ReleaseError")
      assert.deepStrictEqual(readinessCalls, [])
    }))
})

describe("release publish", () => {
  it.effect("reads the OTP from the environment, never from argv, and prints the result as JSON", () =>
    Effect.gen(function*() {
      const { layer, publishCalls } = appLayer({ NPM_OTP: "654321" })
      yield* run(["publish", "--expect-identity", "0123456789abcdef"]).pipe(Effect.provide(layer))
      assert.deepStrictEqual(publishCalls, [{ expectedIdentity: "0123456789abcdef", otp: "654321", dryRun: false }])
      const printed = JSON.parse((yield* TestConsole.logLines).join("\n")) as { _tag: string; websiteRevision: string }
      assert.strictEqual(printed._tag, "AlreadyPublished")
      assert.strictEqual(printed.websiteRevision, LEDGER_SHA)
    }))

  it.effect("rejects an --otp flag", () =>
    Effect.gen(function*() {
      const { layer, publishCalls } = appLayer({ NPM_OTP: "654321" })
      const error = yield* Effect.flip(
        run(["publish", "--expect-identity", "0123456789abcdef", "--otp", "654321"]).pipe(Effect.provide(layer))
      )
      assert.exists(error)
      assert.deepStrictEqual(publishCalls, [])
    }))

  it.effect("fails before publishing when NPM_OTP is not set, and names the variable", () =>
    Effect.gen(function*() {
      const { layer, publishCalls } = appLayer({})
      const error = yield* Effect.flip(
        run(["publish", "--expect-identity", "0123456789abcdef"]).pipe(Effect.provide(layer))
      )
      assert.strictEqual((error as { _tag: string })._tag, "ReleaseError")
      assert.include((error as Error).message, "NPM_OTP")
      assert.deepStrictEqual(publishCalls, [])
    }))

  it.effect("requires --expect-identity", () =>
    Effect.gen(function*() {
      const { layer, publishCalls } = appLayer({ NPM_OTP: "654321" })
      const error = yield* Effect.flip(run(["publish"]).pipe(Effect.provide(layer)))
      assert.exists(error)
      assert.deepStrictEqual(publishCalls, [])
    }))

  it.effect("passes --dry-run through", () =>
    Effect.gen(function*() {
      const { layer, publishCalls } = appLayer({ NPM_OTP: "654321" })
      yield* run(["publish", "--expect-identity", "0123456789abcdef", "--dry-run"]).pipe(Effect.provide(layer))
      assert.deepStrictEqual(publishCalls, [{ expectedIdentity: "0123456789abcdef", otp: "654321", dryRun: true }])
    }))
})
