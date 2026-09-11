import { Effect } from "effect"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

// A separate process lets the regression detect a busy interruption loop that
// prevents even live timers in the affected runtime from firing.
export const runFixture = (url: URL) =>
  Effect.async<{ code: number | null; timedOut: boolean; output: string }>((resume) => {
    const child = spawn(process.execPath, ["--import", "tsx", fileURLToPath(url)], {
      stdio: ["ignore", "pipe", "pipe"]
    })
    let output = ""
    let timedOut = false
    const stop = () => {
      timedOut = true
      child.kill("SIGKILL")
    }
    let timer = setTimeout(stop, 20_000)
    const append = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-8000)
      if (chunk.toString().includes("durable-interrupt-stored-and-abandonment-released")) {
        clearTimeout(timer)
        timer = setTimeout(stop, 3000)
      }
    }
    child.stdout.on("data", append)
    child.stderr.on("data", append)
    child.on("error", (error) => {
      clearTimeout(timer)
      resume(Effect.die(error))
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resume(Effect.succeed({ code, timedOut, output }))
    })
    return Effect.sync(() => {
      clearTimeout(timer)
      child.kill("SIGKILL")
    })
  })
