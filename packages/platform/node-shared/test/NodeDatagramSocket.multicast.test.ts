import * as NodeDatagramSocket from "@effect/platform-node-shared/NodeDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as NetAddress from "effect/net/NetAddress"
import * as Result from "effect/Result"
import type * as DatagramSocket from "effect/socket/DatagramSocket"

// End-to-end multicast delivery depends on the host's network setup, so it
// only runs with EFFECT_MULTICAST_TESTS=1. CI doesn't set it.
const enabled = process.env.EFFECT_MULTICAST_TESTS === "1"

const decoder = new TextDecoder()

const pullN = (reader: DatagramSocket.Reader, count: number) =>
  Effect.gen(function*() {
    const received: Array<DatagramSocket.Datagram> = []
    while (received.length < count) received.push(...(yield* reader.pull))
    return received
  }).pipe(Effect.timeout("2 seconds"))

const group = Result.getOrThrow(NetAddress.ipv4FromOctets([239, 255, 83, 2]))

describe.runIf(enabled)("NodeDatagramSocket multicast", () => {
  it.live("delivers datagrams sent to a joined group", () =>
    Effect.gen(function*() {
      if (!NetAddress.isMulticast(group)) return assert.fail("group is not multicast")
      const receiver = yield* NodeDatagramSocket.make({
        bind: { address: "0.0.0.0", port: 0 },
        reuseAddress: true
      })
      const reader = yield* receiver.reader
      yield* reader.joinMulticast({ group, interface: NetAddress.ipv4Loopback })

      const sender = yield* NodeDatagramSocket.make({
        bind: { address: "127.0.0.1", port: 0 },
        peer: { address: group, port: reader.address.port },
        multicast: { interface: NetAddress.ipv4Loopback, loopback: true, ttl: 1 }
      })
      yield* sender.reader
      const writer = yield* sender.writer
      for (const payload of ["a", "b", "c"]) {
        yield* writer.write({ payload })
      }
      const received = yield* pullN(reader, 3)
      assert.deepStrictEqual(received.map((datagram) => decoder.decode(datagram.payload)), ["a", "b", "c"])
    }), 5_000)
})
