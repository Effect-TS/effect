import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
import * as AddressResolver from "effect/net/AddressResolver"
import * as Dns from "effect/net/Dns"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"

const ip = NetAddress.ipFromStringUnsafe
const endpoint = Host.hostPortFromStringUnsafe

const zone = Dns.layerStatic({
  hosts: {
    "db.internal": [ip("10.0.0.5"), ip("fd00::5")],
    "v4.internal": [ip("10.0.0.4")]
  }
})

const resolver = (options?: AddressResolver.Options) =>
  Effect.service(Dns.Dns).pipe(
    Effect.map((dns) => AddressResolver.make(dns, options)),
    Effect.provide(zone),
    Effect.orDie
  )

describe("AddressResolver", () => {
  it.effect("returns concrete addresses without a lookup", () =>
    Effect.gen(function*() {
      const resolve = yield* resolver()
      const inet = NetAddress.inetAddressFromStringUnsafe("10.0.0.1:80")
      assert.deepStrictEqual(yield* resolve.resolve(inet), [inet])
      const literal = yield* resolve.resolve(endpoint("[::1]:443"))
      assert.deepStrictEqual(literal.map(NetAddress.formatInet), ["[::1]:443"])
      const wrongFamily = yield* Effect.flip(resolve.resolve(inet, { family: "IPv6" }))
      assert.strictEqual(wrongFamily._tag, "DnsError")
    }))

  it.effect("supports only numeric zones without a scope ID lookup", () =>
    Effect.gen(function*() {
      const resolve = yield* resolver()
      const numeric = yield* resolve.resolve(endpoint("[fe80::1%7]:80"))
      assert.deepStrictEqual(numeric.map(NetAddress.formatInet), ["[fe80::1%7]:80"])
      const named = yield* Effect.flip(resolve.resolve(endpoint("[fe80::1%eth0]:80")))
      assert.strictEqual(named._tag, "NetAddressError")
    }))

  it.effect("looks up named zones each time they are resolved", () =>
    Effect.gen(function*() {
      const scopeIds = new Map([["eth0", 2]])
      const lookups: Array<string> = []
      const resolve = yield* resolver({
        scopeId: (name) =>
          Effect.sync(() => {
            lookups.push(name)
            return Option.fromUndefinedOr(scopeIds.get(name))
          })
      })
      const first = yield* resolve.resolve(endpoint("[fe80::1%eth0]:80"))
      assert.deepStrictEqual(first.map(NetAddress.formatInet), ["[fe80::1%2]:80"])
      scopeIds.set("eth0", 5)
      const second = yield* resolve.resolve(endpoint("[fe80::1%eth0]:80"))
      assert.deepStrictEqual(second.map(NetAddress.formatInet), ["[fe80::1%5]:80"])
      const numeric = yield* resolve.resolve(endpoint("[fe80::1%3]:80"))
      assert.deepStrictEqual(numeric.map(NetAddress.formatInet), ["[fe80::1%3]:80"])
      assert.deepStrictEqual(lookups, ["eth0", "eth0"])
      const unknown = yield* Effect.flip(resolve.resolve(endpoint("[fe80::1%wlan0]:80")))
      assert.strictEqual(unknown._tag, "NetAddressError")
    }))

  it.effect("fails when the scope ID lookup fails", () =>
    Effect.gen(function*() {
      const error = new NetAddress.NetAddressError({ input: "eth0", message: "cannot list network interfaces" })
      const resolve = yield* resolver({ scopeId: () => Effect.fail(error) })
      assert.strictEqual(yield* Effect.flip(resolve.resolve(endpoint("[fe80::1%eth0]:80"))), error)
    }))

  it.effect("looks up domain names and attaches the port", () =>
    Effect.gen(function*() {
      const resolve = yield* resolver()
      const all = yield* resolve.resolve(endpoint("db.internal:5432"))
      assert.deepStrictEqual(all.map(NetAddress.formatInet), ["10.0.0.5:5432", "[fd00::5]:5432"])
      const v4 = yield* resolve.resolve(endpoint("db.internal:5432"), { family: "IPv4" })
      const first: NetAddress.InetAddressV4 = v4[0]
      assert.strictEqual(NetAddress.formatInet(first), "10.0.0.5:5432")
      const missing = yield* Effect.flip(resolve.resolve(endpoint("missing.internal:1")))
      assert.strictEqual(missing._tag, "DnsError")
    }))

  it.effect("passes Unix paths through", () =>
    Effect.gen(function*() {
      const resolve = yield* resolver()
      const unix = NetAddress.unixPathAddress("/run/app.sock")
      assert.deepStrictEqual(yield* resolve.resolve(unix), [unix])
      const inet = yield* resolve.resolve(endpoint("v4.internal:1"))
      assert.deepStrictEqual(inet.map(NetAddress.formatSocketAddress), ["10.0.0.4:1"])
    }))

  it.effect("provides the service from a layer", () =>
    Effect.gen(function*() {
      const resolve = yield* AddressResolver.AddressResolver
      const addresses = yield* resolve.resolve(endpoint("v4.internal:1"))
      assert.deepStrictEqual(addresses.map(NetAddress.formatInet), ["10.0.0.4:1"])
    }).pipe(Effect.provide(AddressResolver.layer().pipe(Layer.provide(zone)))))
})
