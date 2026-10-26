import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
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
