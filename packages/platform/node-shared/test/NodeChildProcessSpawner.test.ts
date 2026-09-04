import { buildSpawnOptions } from "@effect/platform-node-shared/internal/nodeChildProcessSpawner"
import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import { assert, describe, it } from "@effect/vitest"
import * as ChildProcessSpawnerTest from "effect-test/unstable/process/ChildProcessSpawnerTest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as ChildProcess from "effect/unstable/process/ChildProcess"
import { join } from "node:path"

const NodeServices = NodeChildProcessSpawner.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(
    NodeFileSystem.layer,
    NodePath.layer
  ))
)

ChildProcessSpawnerTest.suite("NodeChildProcessSpawner", NodeServices, {
  processGroups: true
})

describe("buildSpawnOptions", () => {
  const base = { stdio: "pipe" } as const

  it("defaults to hiding non-detached Windows children", () => {
    assert.deepStrictEqual(buildSpawnOptions({}, base, "win32"), {
      stdio: "pipe",
      detached: false,
      shell: undefined,
      windowsHide: true
    })
    assert.deepStrictEqual(buildSpawnOptions({ detached: true }, base, "win32"), {
      stdio: "pipe",
      detached: true,
      shell: undefined,
      windowsHide: false
    })
    assert.deepStrictEqual(buildSpawnOptions({ detached: false }, base, "win32"), {
      stdio: "pipe",
      detached: false,
      shell: undefined,
      windowsHide: true
    })
  })

  it("allows windowsHide to be configured independently of detached", () => {
    assert.deepStrictEqual(
      buildSpawnOptions({ detached: false, windowsHide: false }, base, "win32"),
      {
        stdio: "pipe",
        detached: false,
        shell: undefined,
        windowsHide: false
      }
    )
    assert.deepStrictEqual(
      buildSpawnOptions({ detached: true, windowsHide: true }, base, "win32"),
      {
        stdio: "pipe",
        detached: true,
        shell: undefined,
        windowsHide: true
      }
    )
  })
})

it.live("kills every process in a pipeline", () =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped()
    const rootHeartbeat = `${directory}/root-heartbeat`
    const childHeartbeat = `${directory}/child-heartbeat`
    const handle = yield* ChildProcess.make(
      "sh",
      ["-c", "while :; do printf x >> \"$1\"; sleep 0.01; done", "pipeline-root", rootHeartbeat]
    ).pipe(ChildProcess.pipeTo(ChildProcess.make(
      "sh",
      ["-c", "while :; do printf x >> \"$1\"; sleep 0.01; done", "pipeline-child", childHeartbeat]
    )))
    yield* Effect.sleep("100 millis")
    yield* handle.kill({ killSignal: "SIGKILL" })
    const rootSizeAfterKill = (yield* fs.stat(rootHeartbeat)).size
    const childSizeAfterKill = (yield* fs.stat(childHeartbeat)).size
    yield* Effect.sleep("100 millis")
    const rootFinalSize = (yield* fs.stat(rootHeartbeat)).size
    const childFinalSize = (yield* fs.stat(childHeartbeat)).size

    assert.strictEqual(rootFinalSize, rootSizeAfterKill)
    assert.strictEqual(childFinalSize, childSizeAfterKill)
  }).pipe(Effect.scoped, Effect.provide(NodeServices)))

const processGroupFixture = join(__dirname, "fixtures", "process-group.ts")

const startProcessGroup = (
  scope: Scope.Scope,
  mode: "exit-on-signal" | "ignore-signal",
  marker: string,
  options?: ChildProcess.CommandOptions
) =>
  Effect.gen(function*() {
    const handle = yield* Scope.provide(scope)(ChildProcess.make(
      process.execPath,
      [processGroupFixture, "leader", mode, marker],
      { stdin: "ignore", ...options }
    ))
    const ready = yield* Deferred.make<void>()
    yield* handle.stdout.pipe(
      Stream.decodeText,
      Stream.splitLines,
      Stream.runForEach((line) => line === "READY" ? Deferred.succeed(ready, undefined) : Effect.void),
      Effect.forkScoped
    )
    yield* Effect.timeout(Deferred.await(ready), "5 seconds")
    return handle
  })

const assertHeartbeatStopped = (marker: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const sizeAfterKill = (yield* fs.stat(marker)).size
    yield* Effect.sleep("100 millis")
    const finalSize = (yield* fs.stat(marker)).size
    assert.strictEqual(finalSize, sizeAfterKill)
  })

describe.skipIf(process.platform === "win32")("process group cleanup", () => {
  it.live("scope release waits for descendants that outlive the leader", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const marker = `${directory}/descendant-exited`
      const scope = yield* Scope.make()
      const handle = yield* startProcessGroup(scope, "exit-on-signal", marker)

      yield* Scope.close(scope, Exit.void)

      assert.isFalse(yield* handle.isRunning)
      assert.isTrue(yield* fs.exists(marker))
    }).pipe(Effect.scoped, Effect.provide(NodeServices)))

  it.live("scope release force kills descendants that ignore the kill signal", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const marker = `${directory}/heartbeat`
      const scope = yield* Scope.make()
      yield* startProcessGroup(scope, "ignore-signal", marker, { forceKillAfter: "200 millis" })

      yield* Scope.close(scope, Exit.void)

      yield* assertHeartbeatStopped(marker)
    }).pipe(Effect.scoped, Effect.provide(NodeServices)))

  it.live("kill force kills descendants that ignore the kill signal", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const marker = `${directory}/heartbeat`
      const scope = yield* Scope.make()
      const handle = yield* startProcessGroup(scope, "ignore-signal", marker)

      yield* handle.kill({ forceKillAfter: "200 millis" })

      assert.isFalse(yield* handle.isRunning)
      yield* assertHeartbeatStopped(marker)
      yield* Scope.close(scope, Exit.void)
    }).pipe(Effect.scoped, Effect.provide(NodeServices)))

  it.live("scope release returns when a descendant holds the inherited pipe without forceKillAfter", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const marker = `${directory}/heartbeat`
      const scope = yield* Scope.make()
      const handle = yield* startProcessGroup(scope, "ignore-signal", marker)

      yield* Scope.close(scope, Exit.void)

      assert.isFalse(yield* handle.isRunning)
    }).pipe(Effect.scoped, Effect.provide(NodeServices)))

  it.live("scope release returns when stdout is unread and backpressured", () =>
    Effect.scoped(Effect.gen(function*() {
      yield* ChildProcess.make(process.execPath, [
        "-e",
        "process.stdout.write(\"x\".repeat(1024 * 1024)); setInterval(() => {}, 1000)"
      ], { stdin: "ignore" })
      yield* Effect.sleep("100 millis")
    })).pipe(Effect.provide(NodeServices)))
})
