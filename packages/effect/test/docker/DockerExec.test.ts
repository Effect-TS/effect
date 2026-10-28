import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Stream } from "effect"
import { type DockerError, DockerExec } from "effect/docker"
import { concat, type Connection, connection, frame, json, makeStubEngine, withPing } from "./utils/stub.ts"

const bytes = (text: string) => new TextEncoder().encode(text)

/** An Engine with one exec `e` that has exited with `exitCode`, starting over `upgrade`. */
const execEngine = (upgrade: Connection, exitCode = 0) =>
  makeStubEngine(
    withPing("1.52", (request) =>
      request.url.pathname.endsWith("/exec")
        ? json({ Id: "e" }, 201)
        : request.url.pathname.endsWith("/start")
        ? { headers: { "content-type": "application/vnd.docker.multiplexed-stream" }, upgrade }
        : json({ ID: "e", Running: false, ExitCode: exitCode, OpenStdin: true, ProcessConfig: { tty: false } }))
  )

/** Starts exec `e` over a connection that sends `output`, and runs `f` with its handle. */
const withHandle = <A>(
  output: ReadonlyArray<Uint8Array>,
  f: (handle: DockerExec.Handle) => Effect.Effect<A, DockerError.DockerError>
) =>
  Effect.scoped(DockerExec.DockerExec.use((exec) => Effect.flatMap(exec.start("e"), f))).pipe(
    execEngine(connection(output)).provide
  )

describe("DockerExec", () => {
  it.effect("runs a command and returns its output and exit code, half-closing stdin", () =>
    Effect.gen(function*() {
      // frames split across reads, one byte at a time
      const wire = concat(frame(1, "out\n"), frame(2, "err\n"))
      const upgraded = connection(Array.from(wire, (byte) => new Uint8Array([byte])))
      const stub = execEngine(upgraded, 3)
      const result = yield* DockerExec.DockerExec.use((exec) => exec.run("c", ["cat"], { stdin: "in" })).pipe(
        stub.provide
      )
      assert.deepStrictEqual(result, { exitCode: 3, stdout: bytes("out\n"), stderr: bytes("err\n") })
      assert.deepStrictEqual(upgraded.written, [bytes("in")])
      assert.isTrue(upgraded.halfClosed)
    }))

  it.effect("returns once the output ends, dropping stdin input that is still pending", () =>
    Effect.gen(function*() {
      const result = yield* DockerExec.DockerExec.use((exec) =>
        exec.run("c", ["echo", "done"], { stdin: Stream.never })
      ).pipe(execEngine(connection([frame(1, "done\n")])).provide)
      assert.deepStrictEqual(result.stdout, bytes("done\n"))
    }))

  it.live("reads the output once, in arrival order, without stalling on output nobody reads", () =>
    Effect.gen(function*() {
      const sent = Array.from({ length: 40 }, (_, i) => i % 3 === 2 ? `e${i}` : `o${i}`)
      const [frames, second] = yield* withHandle(
        sent.map((text) => frame(text.startsWith("e") ? 2 : 1, text)),
        (handle) => Effect.all([Stream.runCollect(handle.frames), Effect.exit(Stream.runDrain(handle.stdout))])
      )
      assert.deepStrictEqual(frames.map((frame) => new TextDecoder().decode(frame.data)), sent)
      assert(Exit.isFailure(second) && Cause.hasDies(second.cause))
      const stdout = yield* withHandle(
        [...Array.from({ length: 100 }, (_, i) => frame(2, `e${i}`)), frame(1, "done")],
        (handle) => Stream.mkString(Stream.decodeText(handle.stdout))
      ).pipe(Effect.timeout("2 seconds"))
      assert.strictEqual(stdout, "done")
    }))
})
