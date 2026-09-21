import { cli, FIXTURE_NAME } from "@effect/release-spike"
import { Findings } from "@effect/release-spike/Findings"
import { assert, describe, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import * as Terminal from "effect/Terminal"
import { TestClock, TestConsole } from "effect/testing"
import * as CliOutput from "effect/unstable/cli/CliOutput"
import * as Command from "effect/unstable/cli/Command"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import { vi } from "vitest"

type RecordEntry = { readonly kind: string; readonly data: unknown }
type SpawnState = { count: number; readonly args: Array<ReadonlyArray<string>> }

const findingsLayer = (records: Array<RecordEntry>) =>
  Layer.succeed(
    Findings,
    Findings.of({
      file: "/findings.jsonl",
      addSecret: () => Effect.void,
      redact: (text) => text,
      redactUnknown: (value) => value,
      record: (kind, data) => Effect.sync(() => records.push({ kind, data })),
      readAll: Effect.succeed([])
    })
  )

const makeHandle = () =>
  ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(1),
    stdin: Sink.drain,
    stdout: Stream.empty,
    stderr: Stream.empty,
    all: Stream.empty,
    exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
    isRunning: Effect.succeed(false),
    kill: () => Effect.void,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.succeed(Effect.void)
  })

const baseLayer = (
  spawns: SpawnState,
  fileSystem = FileSystem.layerNoop({}),
  failSpawn = false
) =>
  Layer.mergeAll(
    fileSystem,
    Path.layer,
    Stdio.layerTest({}),
    TestConsole.layer,
    CliOutput.layer(CliOutput.defaultFormatter({ colors: false })),
    ConfigProvider.layer(ConfigProvider.fromEnv({ env: {} })),
    Layer.succeed(
      Terminal.Terminal,
      Terminal.make({
        columns: Effect.succeed(80),
        rows: Effect.succeed(24),
        readInput: Effect.die("unused"),
        readLine: Effect.die("unused"),
        display: () => Effect.void
      })
    ),
    Layer.succeed(
      ChildProcessSpawner.ChildProcessSpawner,
      ChildProcessSpawner.make((command) => {
        spawns.count++
        if (command._tag === "StandardCommand") spawns.args.push(command.args)
        return failSpawn ? Effect.die("injected spawn failure") : Effect.succeed(makeHandle())
      })
    )
  )

const httpLayer = (
  handler: (requestNumber: number) => { readonly status: number; readonly body: unknown }
) => {
  let requestNumber = 0
  return Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.makeWith(
      Effect.fnUntraced(function*(requestEffect) {
        const request = yield* requestEffect
        const result = handler(requestNumber++)
        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(result.body), {
            status: result.status,
            headers: { "content-type": "application/json" }
          })
        )
      }),
      Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
    )
  )
}

const run = (args: ReadonlyArray<string>) => Command.runWith(cli, { version: "0.0.0", renderErrors: false })(args)

describe("release-spike CLI regressions", () => {
  it.effect("persists every watch observation and settles after three post-change observations", () => {
    const records: Array<RecordEntry> = []
    const recordCountsAtRequest: Array<number> = []
    const statuses = ["awaiting_approval", "staged", "staged", "staged"]
    const spawns: SpawnState = { count: 0, args: [] }
    let requests = 0
    const HttpLayer = httpLayer((requestNumber) => {
      requests++
      recordCountsAtRequest.push(records.filter((entry) => entry.kind === "stage-watch-observation").length)
      const status = statuses[Math.min(requestNumber, statuses.length - 1)]
      return { status: 200, body: { id: "stage-id", packageName: FIXTURE_NAME, version: "0.0.1", status } }
    })

    return Effect.gen(function*() {
      const fiber = yield* Effect.forkChild(
        run(["watch", "stage-id", "--interval", "1", "--timeout", "1"]),
        { startImmediately: true }
      )
      yield* TestClock.adjust("3 seconds")
      yield* Fiber.join(fiber)

      assert.strictEqual(requests, 4)
      assert.deepStrictEqual(recordCountsAtRequest, [0, 1, 2, 3])
      const observations = records
        .filter((entry) => entry.kind === "stage-watch-observation")
        .map((entry) => (entry.data as { status: string }).status)
      assert.deepStrictEqual(observations, ["awaiting_approval", "staged", "staged", "staged"])
      const summary = records.find((entry) => entry.kind === "stage-watch")?.data as {
        transitions: ReadonlyArray<{ status: string }>
      }
      assert.deepStrictEqual(summary.transitions.map((entry) => entry.status), ["awaiting_approval", "staged"])
    }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
  })

  it.effect("times out when the observed status never changes", () => {
    const records: Array<RecordEntry> = []
    const spawns: SpawnState = { count: 0, args: [] }
    const HttpLayer = httpLayer(() => ({
      status: 200,
      body: { id: "stage-id", packageName: FIXTURE_NAME, version: "0.0.1", status: "awaiting_approval" }
    }))

    return Effect.gen(function*() {
      const fiber = yield* Effect.forkChild(
        run(["watch", "stage-id", "--interval", "10", "--timeout", "1"]),
        { startImmediately: true }
      )
      yield* TestClock.adjust("1 minute")
      yield* Fiber.join(fiber)

      const summary = records.find((entry) => entry.kind === "stage-watch")?.data as {
        finalStatus: string
        timedOut: boolean
      }
      assert.strictEqual(summary.finalStatus, "awaiting_approval")
      assert.isTrue(summary.timedOut)
    }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
  })

  it.effect("starts approval batch timing after every preflight", () => {
    const records: Array<RecordEntry> = []
    const spawns: SpawnState = { count: 0, args: [] }
    let now = 0
    const dateNow = vi.spyOn(Date, "now").mockImplementation(() => now)
    const HttpLayer = httpLayer((requestNumber) => {
      now += 10_000
      return {
        status: 200,
        body: {
          id: "fixture-id-" + requestNumber,
          packageName: FIXTURE_NAME,
          version: "0.0.1",
          status: "staged"
        }
      }
    })

    return Effect.gen(function*() {
      yield* run(["approve", "fixture-id-0", "fixture-id-1", "--otp", "123456"])

      assert.strictEqual(spawns.count, 2)
      const summary = records.find((entry) => entry.kind === "stage-approve")?.data as {
        totalMs: number
        results: ReadonlyArray<{ sinceFirstMs: number }>
      }
      assert.strictEqual(summary.totalMs, 0)
      assert.deepStrictEqual(summary.results.map((result) => result.sinceFirstMs), [0, 0])
    }).pipe(
      Effect.ensuring(Effect.sync(() => dateNow.mockRestore())),
      Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer))
    )
  })

  for (const verb of ["approve", "reject"] as const) {
    it.effect(verb + " allows a fixture-owned stage id", () => {
      const records: Array<RecordEntry> = []
      const spawns: SpawnState = { count: 0, args: [] }
      const HttpLayer = httpLayer(() => ({
        status: 200,
        body: { id: "fixture-id", packageName: FIXTURE_NAME, version: "0.0.1", status: "staged" }
      }))

      return Effect.gen(function*() {
        yield* run([verb, "fixture-id", "--otp", "123456"])
        assert.strictEqual(spawns.count, 1)
        assert.deepStrictEqual(spawns.args[0], ["stage", verb, "fixture-id", "--otp", "123456"])
      }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
    })
  }

  for (const verb of ["approve", "reject"] as const) {
    it.effect("refuses to " + verb + " a stage id belonging to another package", () => {
      const records: Array<RecordEntry> = []
      const spawns: SpawnState = { count: 0, args: [] }
      const HttpLayer = httpLayer(() => ({
        status: 200,
        body: { id: "foreign-id", packageName: "@effect/not-the-fixture", version: "1.0.0", status: "staged" }
      }))

      return Effect.gen(function*() {
        const exit = yield* Effect.exit(run([verb, "foreign-id", "--otp", "123456"]))
        assert.strictEqual(exit._tag, "Failure")
        assert.strictEqual(spawns.count, 0)
        const entry = records.find((record) => record.kind === "stage-" + verb + "-preflight-response")
        assert.isDefined(entry)
        assert.include(JSON.stringify(entry.data), "@effect/not-the-fixture")
      }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
    })
  }

  for (const verb of ["approve", "reject"] as const) {
    it.effect("records an unauthorized " + verb + " preflight before failing", () => {
      const records: Array<RecordEntry> = []
      const spawns: SpawnState = { count: 0, args: [] }
      const HttpLayer = httpLayer(() => ({ status: 401, body: { error: "unauthorized" } }))

      return Effect.gen(function*() {
        const exit = yield* Effect.exit(run([verb, "stage-id", "--otp", "123456"]))
        assert.strictEqual(exit._tag, "Failure")
        assert.strictEqual(spawns.count, 0)
        const entry = records.find((record) => record.kind === "stage-" + verb + "-preflight-response")
        assert.isDefined(entry)
        assert.include(JSON.stringify(entry.data), "unauthorized")
      }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
    })
  }

  for (const command of ["list", "view"] as const) {
    for (const status of [401, 500]) {
      it.effect("records the " + status + " " + command + " response before failing", () => {
        const records: Array<RecordEntry> = []
        const spawns: SpawnState = { count: 0, args: [] }
        const HttpLayer = httpLayer(() => ({ status, body: { error: "status-" + status } }))
        const args = command === "list" ? [command, "--anonymous"] : [command, "stage-id", "--anonymous"]

        return Effect.gen(function*() {
          const exit = yield* Effect.exit(run(args))
          assert.strictEqual(exit._tag, "Failure")
          const entry = records.find((record) => record.kind === "stage-" + command)
          assert.isDefined(entry)
          assert.include(JSON.stringify(entry.data), "status-" + status)
        }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
      })
    }
  }

  for (const command of ["list", "view"] as const) {
    it.effect("records the raw " + command + " response before a decode failure", () => {
      const records: Array<RecordEntry> = []
      const spawns: SpawnState = { count: 0, args: [] }
      const HttpLayer = httpLayer(() => ({ status: 200, body: { unexpected: true } }))
      const args = command === "list" ? [command, "--anonymous"] : [command, "stage-id", "--anonymous"]

      return Effect.gen(function*() {
        const exit = yield* Effect.exit(run(args))
        assert.strictEqual(exit._tag, "Failure")
        const entry = records.find((record) => record.kind === "stage-" + command + "-response")
        assert.isDefined(entry)
        assert.include(JSON.stringify(entry.data), "unexpected")
      }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
    })
  }

  it.effect("restores the fixture manifest after staging", () => {
    const records: Array<RecordEntry> = []
    const spawns: SpawnState = { count: 0, args: [] }
    const original = JSON.stringify({ name: FIXTURE_NAME, version: "0.0.0" }, null, 2) + "\n"
    let manifest = original
    const writes: Array<string> = []
    const FsLayer = FileSystem.layerNoop({
      readFileString: () => Effect.succeed(manifest),
      writeFileString: (_path, contents) =>
        Effect.sync(() => {
          writes.push(contents)
          manifest = contents
        })
    })

    return Effect.gen(function*() {
      yield* run(["stage", "--dir", "fixture", "--set-version", "0.0.1", "--dry-run"])
      assert.deepStrictEqual(writes, [
        JSON.stringify({ name: FIXTURE_NAME, version: "0.0.1" }, null, 2) + "\n",
        original
      ])
      assert.strictEqual(manifest, original)
    }).pipe(Effect.provide(Layer.mergeAll(
      baseLayer(spawns, FsLayer),
      findingsLayer(records),
      httpLayer(() => ({ status: 500, body: {} }))
    )))
  })

  it.effect("restores the fixture manifest after an injected spawn failure", () => {
    const records: Array<RecordEntry> = []
    const spawns: SpawnState = { count: 0, args: [] }
    const original = JSON.stringify({ name: FIXTURE_NAME, version: "0.0.0" }, null, 2) + "\n"
    let manifest = original
    const writes: Array<string> = []
    const FsLayer = FileSystem.layerNoop({
      readFileString: () => Effect.succeed(manifest),
      writeFileString: (_path, contents) =>
        Effect.sync(() => {
          writes.push(contents)
          manifest = contents
        })
    })

    return Effect.gen(function*() {
      const exit = yield* Effect.exit(
        run(["stage", "--dir", "fixture", "--set-version", "0.0.1", "--dry-run"])
      )
      assert.strictEqual(exit._tag, "Failure")
      assert.deepStrictEqual(writes, [
        JSON.stringify({ name: FIXTURE_NAME, version: "0.0.1" }, null, 2) + "\n",
        original
      ])
      assert.strictEqual(manifest, original)
    }).pipe(Effect.provide(Layer.mergeAll(
      baseLayer(spawns, FsLayer, true),
      findingsLayer(records),
      httpLayer(() => ({ status: 500, body: {} }))
    )))
  })
})
