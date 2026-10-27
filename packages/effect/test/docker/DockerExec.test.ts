import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Redacted, Stream } from "effect"
import { DockerError, DockerExec } from "effect/docker"
import { concat, type Connection, connection, frame, json, makeStubEngine, withPing } from "./utils/stub.ts"

const bytes = (text: string) => new TextEncoder().encode(text)

/** An Engine with one exec `e` that has exited with `exitCode`, starting over `upgrade`. */
const execEngine = (upgrade: Connection, exitCode = 0) =>
  makeStubEngine(
    withPing("1.44", (request) =>
      request.url.pathname.endsWith("/exec")
        ? json({ Id: "e" }, 201)
        : request.url.pathname.endsWith("/start")
        ? { headers: { "content-type": "application/vnd.docker.multiplexed-stream" }, upgrade }
        : json({ ID: "e", Running: false, ExitCode: exitCode, OpenStdin: true, ProcessConfig: { tty: false } })),
    { config: { detachKeys: "ctrl-x,x" } }
  )

describe("DockerExec", () => {
  it.effect("runs a command and returns its output and exit code, half-closing stdin", () =>
    Effect.gen(function*() {
      // frames split across reads, one byte at a time
      const wire = concat(frame(1, "out\n"), frame(2, "err\n"))
      const upgraded = connection(Array.from(wire, (byte) => new Uint8Array([byte])))
      const stub = execEngine(upgraded, 3)
      const result = yield* DockerExec.DockerExec.use((exec) =>
        exec.run("c", ["cat"], { stdin: "in", env: [Redacted.make("TOKEN=t")] })
      ).pipe(
        stub.provide
      )
      assert.deepStrictEqual(result, { exitCode: 3, stdout: bytes("out\n"), stderr: bytes("err\n") })
      assert.deepStrictEqual(upgraded.written, [bytes("in")])
      assert.isTrue(upgraded.halfClosed)
      const [create, , start] = stub.requests.slice(1)
      assert.deepStrictEqual(JSON.parse(create.body!), {
        Cmd: ["cat"],
        Env: ["TOKEN=t"],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        DetachKeys: "ctrl-x,x"
      })
      assert.strictEqual(start.url.pathname, "/v1.44/exec/e/start")
      assert.strictEqual(start.headers.upgrade, "tcp")
      assert.deepStrictEqual(JSON.parse(start.body!), { Detach: false, Tty: false })
    }))

  it.effect("returns once the output ends, dropping stdin input that is still pending", () =>
    Effect.gen(function*() {
      const result = yield* DockerExec.DockerExec.use((exec) =>
        exec.run("c", ["echo", "done"], { stdin: Stream.never })
      ).pipe(execEngine(connection([frame(1, "done\n")])).provide)
      assert.deepStrictEqual(result.stdout, bytes("done\n"))
    }))

  it.effect("fails with the stdin input's error or ConnectionFailed, and releases the connection", () =>
    Effect.gen(function*() {
      const broken = new DockerError.DockerError({ reason: new DockerError.StreamFailed({ message: "input broke" }) })
      const input = Stream.concat(Stream.make(bytes("part")), Stream.fail(broken))
      const held = connection([], "hold")
      const error = yield* DockerExec.DockerExec.use((exec) => exec.run("c", ["cat"], { stdin: input })).pipe(
        execEngine(held).provide,
        Effect.flip
      )
      // the input's reason, naming the operation it failed
      assert.strictEqual(error.reason, broken.reason)
      assert.strictEqual(error.operation, "docker.Exec.run")
      assert.isTrue(held.halfClosed)
      const reset = yield* DockerExec.DockerExec.use((exec) => exec.run("c", ["true"])).pipe(
        execEngine(connection([frame(1, "x")], "error")).provide,
        Effect.flip
      )
      assert.strictEqual(reset.reason._tag, "ConnectionFailed")
    }))

  it.effect("streams frames, and all, in the order they arrive", () =>
    Effect.gen(function*() {
      // uneven runs of stdout and stderr
      const sent = Array.from({ length: 40 }, (_, i) => i % 3 === 2 ? `e${i}` : `o${i}`)
      const wire = () => connection(sent.map((text) => frame(text.startsWith("e") ? 2 : 1, text)))
      const [frames, second] = yield* Effect.scoped(Effect.gen(function*() {
        const handle = yield* DockerExec.DockerExec.use((exec) => exec.start("e"))
        const frames = yield* Stream.runCollect(handle.frames)
        // one consumer per handle: a second view is a defect, not a DockerError
        return [frames, yield* Effect.exit(Stream.runDrain(handle.stdout))] as const
      })).pipe(execEngine(wire()).provide)
      assert(Exit.isFailure(second) && Cause.hasDies(second.cause))
      assert.deepStrictEqual(
        frames.map((frame) => `${frame.stream}:${new TextDecoder().decode(frame.data)}`),
        sent.map((text) => `${text.startsWith("e") ? "stderr" : "stdout"}:${text}`)
      )
      const all = yield* Effect.scoped(Effect.gen(function*() {
        const handle = yield* DockerExec.DockerExec.use((exec) => exec.start("e"))
        return yield* Stream.runCollect(handle.all)
      })).pipe(execEngine(wire()).provide)
      assert.deepStrictEqual(all.map((chunk) => new TextDecoder().decode(chunk)), sent)
    }))

  it.live("reads a stream alone without stalling on output nobody reads", () =>
    Effect.gen(function*() {
      // far more stderr than any buffer holds, then the stdout being read
      const upgraded = connection([...Array.from({ length: 100 }, (_, i) => frame(2, `e${i}`)), frame(1, "done")])
      const stdout = yield* Effect.scoped(Effect.gen(function*() {
        const handle = yield* DockerExec.DockerExec.use((exec) => exec.start("e"))
        return yield* Stream.mkString(Stream.decodeText(handle.stdout))
      })).pipe(execEngine(upgraded).provide, Effect.timeout("2 seconds"))
      assert.strictEqual(stdout, "done")
    }))

  it.live("reads ahead of a slow reader only boundedly, and stops reading when it stops", () =>
    Effect.gen(function*() {
      const upgraded = connection(Array.from({ length: 1000 }, (_, i) => frame(1, `o${i}`)), "hold")
      const [first, readAhead] = yield* Effect.scoped(Effect.gen(function*() {
        const handle = yield* DockerExec.DockerExec.use((exec) => exec.start("e"))
        const first = yield* Stream.runCollect(Stream.take(handle.stdout, 1))
        yield* Effect.sleep("100 millis")
        return [first, upgraded.read] as const
      })).pipe(execEngine(upgraded).provide, Effect.timeout("2 seconds"))
      assert.deepStrictEqual(first.map((chunk) => new TextDecoder().decode(chunk)), ["o0"])
      assert.isAtMost(readAhead, 64)
      // nothing reads once the handle's scope has closed
      const after = upgraded.read
      yield* Effect.sleep("100 millis")
      assert.strictEqual(upgraded.read, after)
    }))

  it.effect("fails writes to stdin that wasn't attached", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/start")
          ? { upgrade: connection([]) }
          : json({ ID: "e", Running: false, ExitCode: 0, OpenStdin: false, ProcessConfig: { tty: true } })))
      const error = yield* Effect.scoped(Effect.gen(function*() {
        const handle = yield* DockerExec.DockerExec.use((exec) => exec.start("e"))
        return yield* Stream.make(bytes("x")).pipe(Stream.run(handle.stdin), Effect.flip)
      })).pipe(stub.provide)
      assert.strictEqual(error.reason._tag, "StdinNotAttached")
    }))
})
