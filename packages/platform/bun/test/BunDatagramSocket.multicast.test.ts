import * as BunDatagramSocket from "@effect/platform-bun/BunDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as NetAddress from "effect/net/NetAddress"
import type * as DatagramSocket from "effect/socket/DatagramSocket"

// Multicast delivery depends on host routing and is not part of the CI suite.
describe.skipIf(Bun.env.EFFECT_MULTICAST_TESTS !== "1")("BunDatagramSocket multicast delivery", () => {
  it.effect("delivers packets to a joined group", () =>
    Effect.scoped(Effect.gen(function*() {
      const group = NetAddress.ipFromStringUnsafe("239.255.42.43")
      assert.isTrue(NetAddress.isMulticast(group))
      if (!NetAddress.isMulticast(group)) return
      const socket = yield* BunDatagramSocket.make({
        bind: { address: "0.0.0.0" },
        reuseAddress: true,
        multicast: { loopback: true }
      })
      const reader = yield* socket.reader
      yield* reader.joinMulticast({ group, interface: NetAddress.ipv4Loopback })
      const sender = yield* BunDatagramSocket.make({
        multicast: { interface: NetAddress.ipv4Loopback, loopback: true }
      })
      yield* sender.reader
      const writer = yield* sender.writer
      for (const payload of ["m1", "m2"]) {
        yield* writer.write({
          payload,
          address: NetAddress.inetAddressFromIpStringUnsafe("239.255.42.43", reader.address.port)
        })
      }
      const packets: Array<DatagramSocket.Datagram> = []
      while (packets.length < 2) packets.push(...(yield* reader.pull))
      assert.deepStrictEqual(packets.map((packet) => new TextDecoder().decode(packet.payload)), ["m1", "m2"])
    })).pipe(Effect.timeout("5 seconds")))
})
