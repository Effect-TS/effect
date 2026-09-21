import { assert, describe, it } from "@effect/vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Sink from "effect/Sink"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import * as Terminal from "effect/Terminal"
import { TestConsole } from "effect/testing"
import * as CliOutput from "effect/unstable/cli/CliOutput"
import * as Command from "effect/unstable/cli/Command"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import { cli, FIXTURE_NAME } from "../src/Cli.ts"
import { Findings } from "../src/Findings.ts"

type RecordEntry = { readonly kind: string; readonly data: unknown }

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
  spawns: { count: number },
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
      ChildProcessSpawner.make(() => {
        spawns.count++
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
    const statuses = ["validating", "staged", "staged", "staged"]
    const spawns = { count: 0 }
    let requests = 0
    const HttpLayer = httpLayer((requestNumber) => {
      requests++
      recordCountsAtRequest.push(records.filter((entry) => entry.kind === "stage-watch-observation").length)
      const status = statuses[Math.min(requestNumber, statuses.length - 1)]
      return { status: 200, body: { id: "stage-id", packageName: FIXTURE_NAME, version: "0.0.1", status } }
    })

    return Effect.gen(function*() {
      yield* run(["watch", "stage-id", "--interval", "0", "--timeout", "1"])

      assert.strictEqual(requests, 4)
      assert.deepStrictEqual(recordCountsAtRequest, [0, 1, 2, 3])
      const observations = records
        .filter((entry) => entry.kind === "stage-watch-observation")
        .map((entry) => (entry.data as { status: string }).status)
      assert.deepStrictEqual(observations, ["validating", "staged", "staged", "staged"])
      const summary = records.find((entry) => entry.kind === "stage-watch")?.data as {
        transitions: ReadonlyArray<{ status: string }>
      }
      assert.deepStrictEqual(summary.transitions.map((entry) => entry.status), ["validating", "staged"])
    }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
  })

  for (const verb of ["approve", "reject"] as const) {
    it.effect("refuses to " + verb + " a stage id belonging to another package", () => {
      const records: Array<RecordEntry> = []
      const spawns = { count: 0 }
      const HttpLayer = httpLayer(() => ({
        status: 200,
        body: { id: "foreign-id", packageName: "@effect/not-the-fixture", version: "1.0.0", status: "staged" }
      }))

      return Effect.gen(function*() {
        const exit = yield* Effect.exit(run([verb, "foreign-id", "--otp", "123456"]))
        assert.strictEqual(exit._tag, "Failure")
        assert.strictEqual(spawns.count, 0)
      }).pipe(Effect.provide(Layer.mergeAll(baseLayer(spawns), findingsLayer(records), HttpLayer)))
    })
  }

  for (const command of ["list", "view"] as const) {
    for (const status of [401, 500]) {
      it.effect("records the " + status + " " + command + " response before failing", () => {
        const records: Array<RecordEntry> = []
        const spawns = { count: 0 }
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
      const spawns = { count: 0 }
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
    const spawns = { count: 0 }
    const original = JSON.stringify({ name: FIXTURE_NAME, version: "0.0.0" }, null, 2) + "\n"
    let manifest = original
    const FsLayer = FileSystem.layerNoop({
      readFileString: () => Effect.succeed(manifest),
      writeFileString: (_path, contents) =>
        Effect.sync(() => {
          manifest = contents
        })
    })

    return Effect.gen(function*() {
      yield* run(["stage", "--dir", "fixture", "--set-version", "0.0.1", "--dry-run"])
      assert.strictEqual(manifest, original)
    }).pipe(Effect.provide(Layer.mergeAll(
      baseLayer(spawns, FsLayer),
      findingsLayer(records),
      httpLayer(() => ({ status: 500, body: {} }))
    )))
  })

  it.effect("restores the fixture manifest after an injected spawn failure", () => {
    const records: Array<RecordEntry> = []
    const spawns = { count: 0 }
    const original = JSON.stringify({ name: FIXTURE_NAME, version: "0.0.0" }, null, 2) + "\n"
    let manifest = original
    const FsLayer = FileSystem.layerNoop({
      readFileString: () => Effect.succeed(manifest),
      writeFileString: (_path, contents) =>
        Effect.sync(() => {
          manifest = contents
        })
    })

    return Effect.gen(function*() {
      const exit = yield* Effect.exit(
        run(["stage", "--dir", "fixture", "--set-version", "0.0.1", "--dry-run"])
      )
      assert.strictEqual(exit._tag, "Failure")
      assert.strictEqual(manifest, original)
    }).pipe(Effect.provide(Layer.mergeAll(
      baseLayer(spawns, FsLayer, true),
      findingsLayer(records),
      httpLayer(() => ({ status: 500, body: {} }))
    )))
  })
})
