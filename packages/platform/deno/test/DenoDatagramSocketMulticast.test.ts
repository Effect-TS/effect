import * as DenoDatagramSocket from "@effect/platform-deno/DenoDatagramSocket"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as NetAddress from "effect/net/NetAddress"

// Multicast delivery depends on host routing and is intentionally not a CI gate.
describe.skipIf(Deno.env.get("EFFECT_MULTICAST_TESTS") !== "1")("DenoDatagramSocket multicast delivery", () => {
  it.effect(
    "delivers packets to a joined group",
    () =>
      Effect.gen(function*() {
        const group = NetAddress.ipFromStringUnsafe("239.255.42.42")
        if (!NetAddress.isMulticast(group)) throw new Error("expected multicast group")
        const socket = DenoDatagramSocket.make({
          bind: { address: "0.0.0.0" },
          reuseAddress: true,
          multicast: { loopback: true }
        })
        const reader = yield* socket.reader
        yield* reader.joinMulticast({ group })
        const sender = DenoDatagramSocket.make({ multicast: { loopback: true } })
        yield* sender.reader
        const writer = yield* sender.writer
        yield* writer.write({ payload: "multicast", address: NetAddress.inetAddressUnsafe(group, reader.address.port) })
        const [packet] = yield* reader.pull
        assert.strictEqual(new TextDecoder().decode(packet.payload), "multicast")
      }).pipe(Effect.scoped, Effect.timeout("5 seconds"))
  )
})
