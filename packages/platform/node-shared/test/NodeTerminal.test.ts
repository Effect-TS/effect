import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as Terminal from "effect/Terminal"
import { spawn, spawnSync } from "node:child_process"
import { join } from "node:path"

const dimensions = (columns: number | undefined, rows: number | undefined) =>
  Effect.sync(() => {
    Object.defineProperty(process.stdout, "columns", { configurable: true, value: columns })
    Object.defineProperty(process.stdout, "rows", { configurable: true, value: rows })
  })

const restoreDimensions = Effect.gen(function*() {
  const descriptors = ["columns", "rows"].map((key) => Object.getOwnPropertyDescriptor(process.stdout, key))
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      ;["columns", "rows"].forEach((key, index) => {
        const descriptor = descriptors[index]
        if (descriptor === undefined) Reflect.deleteProperty(process.stdout, key)
        else Object.defineProperty(process.stdout, key, descriptor)
      })
    })
  )
})

const subscribe = Effect.fnUntraced(function*(terminal: Terminal.Terminal) {
  const queue = yield* Queue.make<Terminal.Size>()
  yield* terminal.size.pipe(
    Stream.runForEach((size) => Queue.offer(queue, size)),
    Effect.forkScoped
  )
  return queue
})

const fixture = join(__dirname, "fixtures", "node-terminal.ts")

const runFixture = (mode: string, input: string) =>
  spawnSync(process.execPath, [fixture, mode], {
    encoding: "utf8",
    input,
    // Includes Node startup and loading the fixture imports under CI worker load.
    timeout: 10_000
  })

const assertResult = (mode: string, input: string, expected: string) => {
  const result = runFixture(mode, input)
  assert.isUndefined(result.error)
  assert.strictEqual(result.status, 0, result.stderr)
  assert.isTrue(result.stderr.includes(`RESULT ${expected}`), result.stderr)
}

const assertOpenResult = (mode: string, input: string, expected: string) =>
  Effect.callback<void>((resume) => {
    const child = spawn(process.execPath, [fixture, mode])
    let stderr = ""
    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (data) => {
      stderr += data
      if (stderr.includes("RESULT ")) {
        child.stdin.end()
      }
    })
    child.on("exit", (code) => {
      resume(
        code === 0 && stderr.includes(`RESULT ${expected}`)
          ? Effect.void
          : Effect.die(new Error(stderr))
      )
    })
    child.stdin.write(input)
    return Effect.sync(() => child.kill())
  })

const runOpenSelect = (input: string, customQuit = false) =>
  Effect.callback<{ stdout: string; stderr: string }>((resume) => {
    const child = spawn(process.execPath, [fixture, customQuit ? "select-custom-quit" : "select"])
    let stdout = ""
    let stderr = ""
    let submitted = false
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (data) => {
      stdout += data
      // Wait for bare Esc to be decoded before submitting the custom prompt.
      if (customQuit && !submitted && stdout.includes("\x07")) {
        submitted = true
        child.stdin.write("\r")
      }
    })
    child.stderr.on("data", (data) => {
      stderr += data
      if (stderr.includes("RESULT ")) {
        child.stdin.end()
      }
    })
    child.on("error", (error) => resume(Effect.die(error)))
    child.on("close", (code) => {
      resume(code === 0 ? Effect.succeed({ stdout, stderr }) : Effect.die(new Error(stderr)))
    })
    child.stdin.write(input)
    return Effect.sync(() => child.kill())
  })

// spawnSync blocks the Vitest worker; concurrent tests share a running timeout
// while waiting for other fixture processes to finish.
describe("NodeTerminal", { concurrent: false, timeout: 15_000 }, () => {
  it.effect("bare Esc cancels Select with QuitError and restores the cursor while stdin remains open", () =>
    Effect.gen(function*() {
      const { stderr, stdout } = yield* runOpenSelect("\x1b")
      assert.include(stderr, "RESULT \"QuitError\"", `Bare Esc output: ${JSON.stringify(stdout)}`)
      assert.include(stdout, "\x1b[?25l")
      assert.isTrue(stdout.endsWith("\x1b[?25h"), stdout)
    }))

  it.effect("an arrow escape sequence navigates Select and Enter submits", () =>
    Effect.gen(function*() {
      const { stderr } = yield* runOpenSelect("\x1b[B\r")
      assert.include(stderr, "RESULT \"banana\"")
    }))

  it.effect("an explicit shouldQuit predicate can keep Esc non-cancelling", () =>
    Effect.gen(function*() {
      const { stderr, stdout } = yield* runOpenSelect("\x1b", true)
      assert.include(stdout, "\x07")
      assert.include(stderr, "RESULT \"apple\"")
    }))

  it("does not install a readline interface until the terminal is used", () => {
    assertResult("unused", "", "{\"dataListeners\":0}")
  })

  it("fails a prompt with QuitError after piped input is exhausted", () => {
    assertResult("prompts", "y\n", "{\"first\":true,\"second\":\"QuitError\"}")
  })

  it("delivers buffered keypresses before ending the input queue", () => {
    assertResult("read-input", "yn", "{\"first\":\"y\",\"second\":\"n\",\"ended\":true}")
  })

  it("flushes an unterminated line before failing readLine with QuitError at EOF", () => {
    assertResult("read-line", "last line", "{\"first\":\"last line\",\"second\":\"QuitError\"}")
  })

  it("preserves lines buffered between sequential readLine calls", () => {
    assertResult("read-lines", "first\nsecond\n", "{\"first\":\"first\",\"second\":\"second\"}")
  })

  it("fails readLine with QuitError when stdin ended before initialization", () => {
    assertResult("read-line-after-end", "", "\"QuitError\"")
  })

  it.effect("disposes readline after its idle TTL", () =>
    assertOpenResult(
      "read-line-disposed",
      "line\n",
      "{\"line\":\"line\",\"duringTtl\":1,\"dataListeners\":0}"
    ))

  describe("size", () => {
    it.effect("broadcasts the initial size and distinct resizes, with current getters and late subscribers", () =>
      Effect.gen(function*() {
        yield* restoreDimensions
        yield* dimensions(80, 24)
        const terminal = yield* NodeTerminal.make()
        const first = yield* subscribe(terminal)
        const second = yield* subscribe(terminal)
        assert.deepStrictEqual(yield* Queue.take(first), { columns: 80, rows: 24 })
        assert.deepStrictEqual(yield* Queue.take(second), { columns: 80, rows: 24 })

        yield* dimensions(120, 24)
        process.stdout.emit("resize")
        assert.strictEqual(yield* terminal.columns, 120)
        assert.deepStrictEqual(yield* Queue.take(first), { columns: 120, rows: 24 })
        assert.deepStrictEqual(yield* Queue.take(second), { columns: 120, rows: 24 })

        const late = yield* subscribe(terminal)
        assert.deepStrictEqual(yield* Queue.take(late), { columns: 120, rows: 24 })
        process.stdout.emit("resize") // An unchanged size must not be emitted again.
        yield* Effect.yieldNow
        yield* dimensions(120, 50)
        process.stdout.emit("resize")
        assert.strictEqual(yield* terminal.rows, 50)
        for (const subscriber of [first, second, late]) {
          assert.deepStrictEqual(yield* Queue.take(subscriber), { columns: 120, rows: 50 })
        }
      }))

    it.effect("coalesces pending resizes while getters read the latest available dimensions", () =>
      Effect.gen(function*() {
        yield* restoreDimensions
        yield* dimensions(60, 20)
        const terminal = yield* NodeTerminal.make()
        yield* dimensions(80, 24)
        const pull = yield* Stream.toPull(terminal.size)
        assert.deepStrictEqual(yield* pull, [{ columns: 80, rows: 24 }])

        yield* dimensions(100, 30)
        process.stdout.emit("resize")
        yield* dimensions(120, 50)
        process.stdout.emit("resize")
        assert.deepStrictEqual(yield* pull, [{ columns: 120, rows: 50 }])

        yield* dimensions(140, 60)
        assert.strictEqual(yield* terminal.columns, 140)
        assert.strictEqual(yield* terminal.rows, 60)
      }))

    it.effect("reports zero for unavailable dimensions on redirected output", () =>
      Effect.gen(function*() {
        yield* restoreDimensions
        yield* dimensions(undefined, undefined)
        const terminal = yield* NodeTerminal.make()
        assert.deepStrictEqual(yield* terminal.size.pipe(Stream.take(1), Stream.runCollect), [{ columns: 0, rows: 0 }])
        assert.strictEqual(yield* terminal.columns, 0)
        assert.strictEqual(yield* terminal.rows, 0)
      }))

    it.effect("listens only during subscriptions and removes only the completed subscription's listener", () =>
      Effect.gen(function*() {
        const unrelated = () => {}
        yield* Effect.acquireRelease(
          Effect.sync(() => process.stdout.on("resize", unrelated)),
          () => Effect.sync(() => process.stdout.off("resize", unrelated))
        )
        const before = process.stdout.listeners("resize")
        const terminal = yield* NodeTerminal.make()
        assert.deepStrictEqual(process.stdout.listeners("resize"), before)
        yield* terminal.size.pipe(Stream.take(1), Stream.runDrain)
        assert.deepStrictEqual(process.stdout.listeners("resize"), before)

        const first = yield* subscribe(terminal)
        yield* Queue.take(first)
        const duringFirst = process.stdout.listeners("resize")
        const scope = yield* Scope.make()
        yield* Effect.addFinalizer(() => Scope.close(scope, Exit.void))
        const second = yield* subscribe(terminal).pipe(Scope.provide(scope))
        yield* Queue.take(second)
        assert.strictEqual(process.stdout.listenerCount("resize"), before.length + 2)
        yield* Scope.close(scope, Exit.void)
        assert.deepStrictEqual(process.stdout.listeners("resize"), duringFirst)
      }))
  })
})
