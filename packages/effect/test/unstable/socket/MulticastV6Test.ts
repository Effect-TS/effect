import { assert, describe, it } from "@effect/vitest"
import { Effect, Result } from "effect"
import type * as Layer from "effect/Layer"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Multicast from "effect/unstable/socket/Multicast"
import * as Os from "node:os"

export const suite = (name: string, layer: Layer.Layer<Multicast.MulticastFactory>) => {
  const loopback = Object.values(Os.networkInterfaces()).flat().find((address) =>
    address?.internal && address.family === "IPv6" && address.scopeid > 0
  )
  // Linux loopback commonly has no scoped IPv6 address or multicast route.
  describe.skipIf(loopback === undefined)(`${name} with scoped IPv6 loopback`, () => {
    it.live("sends and receives using the requested interface index", () =>
      Effect.gen(function*() {
        const networkInterface: Multicast.Ipv6Interface = { _tag: "Ipv6", index: loopback!.scopeid! }
        const group = Result.getOrThrow(NetAddress.ipv6FromString("ff02::114"))
        const localAddress = NetAddress.inetAddressFromIpStringUnsafe("::", 0)
        const receiver = yield* Multicast.bind({ localAddress, memberships: [{ group, interface: networkInterface }] })
        const sender = yield* Multicast.bind({ localAddress, outgoingInterface: networkInterface })
        yield* sender.writer.write({
          data: new Uint8Array([6]),
          destination: Result.getOrThrow(
            NetAddress.inetAddressV6(group, receiver.address.port, { scopeId: networkInterface.index })
          )
        })
        assert.deepStrictEqual(Array.from((yield* receiver.reader.pull)[0].data), [6])
      }).pipe(Effect.provide(layer), Effect.timeout("3 seconds")))
  })
}
