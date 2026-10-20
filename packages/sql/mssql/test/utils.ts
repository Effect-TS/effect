import { MssqlClient } from "@effect/sql-mssql"
import { MSSQLServerContainer } from "@testcontainers/mssqlserver"
import { Context, Data, Effect, Layer, Redacted } from "effect"
import type { Readable } from "node:stream"

export class ContainerError extends Data.TaggedError("ContainerError")<{
  cause: unknown
  message: string
}> {}

// testcontainers removes a container that fails its wait strategy, discarding its
// output. Keep the tail of it so startup failures report why sqlservr exited.
// Both the number of lines and the length of each line are capped.
const maxLogLines = 200
const maxLineLength = 1000

export const makeLogBuffer = () => {
  const lines: Array<string> = []
  let partial = ""
  let partialTruncated = false
  let done: Promise<void> | undefined
  const push = (line: string, truncated = false) => {
    // sqlservr terminates lines with "\n\r"
    line = line.replace(/^\r+|\r+$/g, "")
    lines.push(
      truncated || line.length > maxLineLength ? `[truncated] ${line.slice(-maxLineLength)}` : line
    )
    if (lines.length > maxLogLines) lines.shift()
  }
  const consume = (stream: Readable) => {
    done = new Promise((resolve) => {
      stream.on("data", (chunk: string) => {
        const parts = (partial + chunk).split("\n")
        const last = parts.pop()!
        for (const line of parts) {
          push(line, partialTruncated)
          partialTruncated = false
        }
        // keep only the tail of an unterminated line so newline-free output stays bounded
        partialTruncated = partialTruncated || last.length > maxLineLength
        partial = last.slice(-maxLineLength)
      })
      stream.once("end", resolve)
      stream.once("close", resolve)
      stream.once("error", (error) => {
        push(`[log stream error] ${error}`)
        resolve()
      })
    })
  }
  // The container has been stopped by the time start() rejects, so the stream
  // should be ending; bound the wait in case it never does.
  const drain = Effect.promise(() => done ?? Promise.resolve()).pipe(
    Effect.timeoutOption("1 second"),
    Effect.map(() => {
      if (partial !== "") {
        push(partial, partialTruncated)
        partial = ""
        partialTruncated = false
      }
      return lines.length === 0
        ? "Failed to start container (no container output captured)"
        : `Failed to start container. Last ${lines.length} line(s) of container output:\n${lines.join("\n")}`
    })
  )
  return { consume, drain } as const
}

export class MssqlContainer extends Context.Service<MssqlContainer>()("test/MssqlContainer", {
  make: Effect.suspend(() => {
    const logs = makeLogBuffer()
    return Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2022-latest")
            .acceptLicense()
            .withLogConsumer(logs.consume)
            .start(),
        catch: (cause) => cause
      }).pipe(
        Effect.catch((cause) =>
          Effect.flatMap(logs.drain, (message) => Effect.fail(new ContainerError({ cause, message })))
        )
      ),
      (container) => Effect.promise(() => container.stop())
    )
  })
}) {
  static readonly layer = Layer.effect(this)(this.make)

  static layerClient = Layer.unwrap(
    Effect.gen(function*() {
      const container = yield* MssqlContainer
      return MssqlClient.layer({
        server: container.getHost(),
        port: container.getPort(),
        database: container.getDatabase(),
        username: container.getUsername(),
        password: Redacted.make(container.getPassword()),
        // Deno does not enforce TLS fragment limits required by Tedious for large TDS writes.
        // Disable transport encryption only for the local Deno fixture; keep Node TLS coverage.
        encrypt: !("Deno" in globalThis),
        trustServer: true
      })
    })
  ).pipe(Layer.provide(this.layer))
}
