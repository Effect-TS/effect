import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { DockerExec } from "effect/docker"
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
        : json({ ID: "e", Running: false, ExitCode: exitCode, OpenStdin: true, ProcessConfig: { tty: false } }))
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
})
