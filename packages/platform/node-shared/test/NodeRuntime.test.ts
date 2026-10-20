import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { spawn } from "node:child_process"
import { join } from "node:path"

describe.skipIf(process.platform === "win32")("NodeRuntime", () => {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    for (const yieldFirst of [false, true]) {
      it.effect(
        `runs finalizers on ${signal} during ${yieldFirst ? "post-yield" : "synchronous"} startup`,
        () =>
          Effect.gen(function*() {
            const result = yield* Effect.callback<{
              code: number | null
              signal: NodeJS.Signals | null
              stdout: string
              stderr: string
            }>((resume) => {
              const child = spawn(process.execPath, [
                join(__dirname, "fixtures", "node-runtime.ts"),
                ...(yieldFirst ? ["yield-first"] : [])
              ], { timeout: 10_000, killSignal: "SIGKILL" })
              let stdout = ""
              let stderr = ""
              let signaled = false
              child.stdout.setEncoding("utf8")
              child.stderr.setEncoding("utf8")
              child.stdout.on("data", (data) => {
                stdout += data
                if (!signaled && stdout.includes("ready\n")) {
                  signaled = true
                  // The fixture cannot finish its synchronous segment until we
                  // release stdin, so the signal always arrives during startup.
                  child.kill(signal)
                  child.stdin.end("release")
                }
              })
              child.stderr.on("data", (data) => {
                stderr += data
              })
              // A default signal termination can close stdin before the release.
              child.stdin.on("error", () => {})
              child.on("error", (error) => resume(Effect.die(error)))
              child.on("close", (code, signal) => resume(Effect.succeed({ code, signal, stdout, stderr })))
              return Effect.sync(() => {
                child.kill("SIGKILL")
              })
            })
            assert.deepStrictEqual(result, { code: 130, signal: null, stdout: "ready\nfinalizer ran\n", stderr: "" })
          }),
        { timeout: 15_000 }
      )
    }
  }
})
