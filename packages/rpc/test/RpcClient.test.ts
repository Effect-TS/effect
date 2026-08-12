import * as Socket from "@effect/platform/Socket"
import type { RpcClientError } from "@effect/rpc"
import { RpcClient, RpcSerialization } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Schedule } from "effect"

describe("RpcClient", () => {
  it.effect("includes socket close details in protocol errors", () =>
    Effect.scoped(Effect.gen(function*() {
      const socketError = new Socket.SocketCloseError({
        reason: "Close",
        code: 1006,
        closeReason: "connection lost"
      })
      const socket: Socket.Socket = {
        [Socket.TypeId]: Socket.TypeId,
        run: () => Effect.fail(socketError),
        runRaw: () => Effect.fail(socketError),
        writer: Effect.succeed(() => Effect.void)
      }
      const errorLatch = yield* Deferred.make<RpcClientError.RpcClientError>()
      const protocol = yield* RpcClient.makeProtocolSocket({
        retrySchedule: Schedule.stop
      }).pipe(
        Effect.provideService(Socket.Socket, socket),
        Effect.provideService(RpcSerialization.RpcSerialization, RpcSerialization.json)
      )

      yield* protocol.run((response) =>
        response._tag === "ClientProtocolError"
          ? Deferred.succeed(errorLatch, response.error)
          : Effect.void
      ).pipe(Effect.forkScoped)

      const error = yield* Deferred.await(errorLatch)
      assert.strictEqual(error.message, "Socket Close: 1006: connection lost")
      assert.strictEqual(error.cause, socketError)
    })))
})
