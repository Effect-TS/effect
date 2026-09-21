import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import * as Redacted from "effect/Redacted"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import type * as ChildProcess from "effect/unstable/process/ChildProcess"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import { Findings } from "../src/Findings.ts"
import { runPnpm, stageIdsFromJson } from "../src/Pnpm.ts"

const makeHandle = (stdout: string, stderr: string) =>
  ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(1),
    stdin: Sink.drain,
    stdout: Stream.make(stdout).pipe(Stream.encodeText),
    stderr: Stream.make(stderr).pipe(Stream.encodeText),
    all: Stream.empty,
    exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
    isRunning: Effect.succeed(false),
    kill: () => Effect.void,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.succeed(Effect.void)
  })

describe("runPnpm", () => {
  it.effect("passes the OTP on argv and redacts both credentials from output", () => {
    const token = "registry-token-value"
    const otp = "123456"
    let spawned: ChildProcess.StandardCommand | undefined
    const SpawnerLayer = Layer.succeed(
      ChildProcessSpawner.ChildProcessSpawner,
      ChildProcessSpawner.make((command) => {
        assert.strictEqual(command._tag, "StandardCommand")
        spawned = command as ChildProcess.StandardCommand
        return Effect.succeed(makeHandle(
          `stdout \${token} \${otp}`,
          `stderr \${otp} \${token}`
        ))
      })
    )
    const FindingsLayer = Findings.layer("/tmp/findings.jsonl").pipe(
      Layer.provide(Layer.mergeAll(FileSystem.layerNoop({}), Path.layer))
    )

    return Effect.gen(function*() {
      const result = yield* runPnpm(["stage", "approve", "stage-id"], {
        cwd: "/repo",
        token: Option.some(Redacted.make(token)),
        otp: Option.some(Redacted.make(otp))
      })

      assert.deepStrictEqual(spawned?.args, ["stage", "approve", "stage-id", "--otp", otp])
      assert.strictEqual(spawned?.options.env?.["npm_config_//registry.npmjs.org/:_authToken"], token)
      assert.notInclude(result.stdout, token)
      assert.notInclude(result.stdout, otp)
      assert.notInclude(result.stderr, token)
      assert.notInclude(result.stderr, otp)
    }).pipe(Effect.provide(Layer.mergeAll(SpawnerLayer, FindingsLayer)))
  })
})

describe("stageIdsFromJson", () => {
  it("distinguishes a real summary from dry-run and malformed output", () => {
    assert.deepStrictEqual(
      stageIdsFromJson("{\"@effect/release-spike-fixture\":{\"stageId\":\"stage-id\"}}"),
      [{ name: "@effect/release-spike-fixture", stageId: "stage-id" }]
    )
    assert.deepStrictEqual(stageIdsFromJson("{\"@effect/release-spike-fixture\":{}}"), [])
    assert.deepStrictEqual(stageIdsFromJson("not json"), [])
  })
})
