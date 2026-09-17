import * as NodeMulticast from "@effect/platform-node-shared/NodeMulticast"
import { afterEach, assert, describe, it } from "@effect/vitest"
import { Effect, Result } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Dgram from "node:dgram"
import * as Process from "node:process"
import { vi } from "vitest"

vi.mock("node:os", () => ({
  networkInterfaces: () => ({ "effect-test": [{ family: "IPv6", scopeid: 73 }] })
}))

afterEach(() => vi.restoreAllMocks())

describe("NodeMulticast configuration", { concurrent: false }, () => {
  it.live("forwards zero and false without substituting defaults", () =>
    Effect.gen(function*() {
      const ttl = vi.spyOn(Dgram.Socket.prototype, "setMulticastTTL").mockReturnValue(0)
      const loopback = vi.spyOn(Dgram.Socket.prototype, "setMulticastLoopback").mockReturnValue(false)
      yield* NodeMulticast.bind({
        localAddress: NetAddress.inetAddressFromIpStringUnsafe("0.0.0.0", 0),
        hopLimit: 0,
        loopback: false
      })
      assert.deepStrictEqual(ttl.mock.calls, [[0]])
      assert.deepStrictEqual(loopback.mock.calls, [[false]])
    }))

  it.live("resolves IPv6 indices to Unix names and preserves numeric Windows zones", () =>
    Effect.gen(function*() {
      const outgoing = vi.spyOn(Dgram.Socket.prototype, "setMulticastInterface").mockImplementation(() => {})
      const join = vi.spyOn(Dgram.Socket.prototype, "addMembership").mockImplementation(() => {})
      yield* NodeMulticast.bind({
        localAddress: NetAddress.inetAddressFromIpStringUnsafe("::", 0),
        memberships: [{
          group: Result.getOrThrow(NetAddress.ipv6FromString("ff02::114")),
          interface: { _tag: "Ipv6", index: 73 }
        }],
        outgoingInterface: { _tag: "Ipv6", index: 73 }
      })
      const zone = Process.platform === "win32" ? "::%73" : "::%effect-test"
      assert.deepStrictEqual(outgoing.mock.calls, [[zone]])
      assert.deepStrictEqual(join.mock.calls, [["ff02::114", zone]])
    }))

  it.live("reports which setting failed and preserves the native cause", () =>
    Effect.gen(function*() {
      const cause = new Error("unsupported multicast option")
      vi.spyOn(Dgram.Socket.prototype, "setMulticastTTL").mockImplementation(() => {
        throw cause
      })
      const error = yield* NodeMulticast.bind({
        localAddress: NetAddress.inetAddressFromIpStringUnsafe("0.0.0.0", 0),
        hopLimit: 17
      }).pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
      assert.deepStrictEqual(error.cause, { operation: "setMulticastTTL", value: 17, cause })
    }))

  describe.skipIf(Process.platform === "win32")("Unix interface lookup", () => {
    it.live("rejects unknown indices instead of selecting the default interface", () =>
      Effect.gen(function*() {
        const outgoing = vi.spyOn(Dgram.Socket.prototype, "setMulticastInterface")
        const error = yield* NodeMulticast.bind({
          localAddress: NetAddress.inetAddressFromIpStringUnsafe("::", 0),
          outgoingInterface: { _tag: "Ipv6", index: 74 }
        }).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "DatagramSocketOpenError")
        assert.strictEqual(outgoing.mock.calls.length, 0)
      }))
  })
})
