import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import { ConnectionError, SqlError } from "effect/sql/SqlError"
import * as Dgram from "node:dgram"
import * as Net from "node:net"
import * as MssqlProtocol from "../MssqlProtocol.ts"

/** The SQL Server Browser's UDP port. */
const defaultBrowserPort = 1434

const browserError = (cause: unknown, message: string): SqlError =>
  new SqlError({
    reason: new ConnectionError({ cause, message: `MssqlConnection: ${message}`, operation: "connect" })
  })

/**
 * Asks the SQL Server Browser on `server` for the TCP port of a named
 * instance, waiting at most `timeoutMillis` for the reply.
 *
 * @internal
 */
export const lookupInstancePort = (options: {
  readonly server: string
  readonly instanceName: string
  readonly timeoutMillis: number
  readonly browserPort?: number | undefined
}): Effect.Effect<number, SqlError> =>
  Effect.callback((resume) => {
    const request = MssqlProtocol.encodeInstanceRequest(options.instanceName)
    if (Result.isFailure(request)) {
      resume(Effect.fail(browserError(request.failure, request.failure.message)))
      return
    }
    const socket = Dgram.createSocket(Net.isIPv6(options.server) ? "udp6" : "udp4")
    let finished = false
    const complete = (result: Effect.Effect<number, SqlError>): void => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      socket.close()
      resume(result)
    }
    const timer = setTimeout(
      () =>
        complete(Effect.fail(browserError(new Error("SQL Browser lookup timed out"), "SQL Browser lookup timed out"))),
      options.timeoutMillis
    )
    socket.on("error", (cause) => complete(Effect.fail(browserError(cause, "SQL Browser lookup failed"))))
    socket.on("message", (message: Uint8Array) => {
      const port = MssqlProtocol.decodeInstanceResponse(message, options.instanceName)
      complete(
        Result.isFailure(port)
          ? Effect.fail(browserError(port.failure, port.failure.message))
          : Effect.succeed(port.success)
      )
    })
    socket.connect(options.browserPort ?? defaultBrowserPort, options.server, () => {
      if (finished) return
      socket.send(request.success, (cause) => {
        if (cause) complete(Effect.fail(browserError(cause, "SQL Browser lookup failed")))
      })
    })
    return Effect.sync(() => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      socket.close()
    })
  })
