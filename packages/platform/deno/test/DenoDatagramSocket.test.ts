import * as Platform from "@effect/platform-deno/DenoDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import { testLayer } from "../../../effect/test/unstable/socket/DatagramSocket.test-utils.ts"

const loopback = NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 0)

describe("DenoDatagramSocket", () => {
  testLayer(Platform.layer)

  it.effect("preserves the destination of native send failures", () =>
    Effect.gen(function*() {
      const socket = yield* Platform.bind({ localAddress: loopback })
      const error = yield* socket.writer.write({ data: new Uint8Array([1]), destination: loopback }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketWriteError")
      assert.deepStrictEqual(
        error.reason,
        new Datagram.DatagramSocketWriteError({
          cause: error.cause,
          destination: loopback
        })
      )
    }))
})
