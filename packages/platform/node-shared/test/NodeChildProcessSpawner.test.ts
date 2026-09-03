import { buildSpawnOptions } from "@effect/platform-node-shared/internal/nodeChildProcessSpawner"
import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import { assert, describe, it } from "@effect/vitest"
import * as ChildProcessSpawnerTest from "effect-test/unstable/process/ChildProcessSpawnerTest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as ChildProcess from "effect/unstable/process/ChildProcess"

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

const shellLeaderWrapper = `import { spawn } from "node:child_process"
const child = spawn(process.execPath, ["-e", \`
  process.once("SIGTERM", () => { console.log("child:SIGTERM"); process.exit(0) })
  setTimeout(() => process.exit(0), 4000)
\`], { detached: true, stdio: ["ignore", "inherit", "inherit"] })
process.once("SIGTERM", () => {
  console.log("wrapper:SIGTERM")
  setTimeout(() => process.kill(-child.pid, "SIGTERM"), 150)
})
child.once("exit", () => process.exit(0))
console.log("READY")
`

it.live.skipIf(process.platform === "win32")(
  "scoped release waits for inherited stdio after a shell leader exits",
  () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const wrapperPath = `${directory}/wrapper.mjs`
      yield* fs.writeFileString(wrapperPath, shellLeaderWrapper)
      const scope = yield* Scope.make()
      const handle = yield* Scope.provide(scope)(ChildProcess.make(
        `"${process.execPath}" "${wrapperPath}"`,
        [],
        {
          shell: true,
          stdin: "ignore",
          stdout: "pipe",
          stderr: "pipe",
          killSignal: "SIGTERM",
          forceKillAfter: "15 seconds"
        }
      ))
      const lines: Array<string> = []
      yield* handle.stdout.pipe(
        Stream.decodeText,
        Stream.splitLines,
        Stream.runForEach((line) =>
          Effect.sync(() => {
            lines.push(line)
          })
        ),
        Effect.forkScoped
      )
      yield* Effect.sync(() => lines.includes("READY")).pipe(
        Effect.repeat({
          while: (ready) => !ready,
          schedule: Schedule.spaced("10 millis")
        }),
        Effect.timeout("2 seconds")
      )
      yield* Scope.close(scope, Exit.void)
      assert.isTrue(lines.includes("wrapper:SIGTERM"))
      assert.isTrue(lines.includes("child:SIGTERM"))
    }).pipe(Effect.scoped, Effect.provide(NodeServices))
)
