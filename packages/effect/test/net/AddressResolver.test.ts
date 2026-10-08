import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import * as AddressResolver from "effect/net/AddressResolver"
import * as Dns from "effect/net/Dns"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"

const ip = NetAddress.ipFromStringUnsafe
const endpoint = Host.hostPortFromStringUnsafe

const resolver = (options?: AddressResolver.MakeOptions) =>
  Effect.service(Dns.Dns).pipe(
    Effect.map((dns) => AddressResolver.make(dns, options)),
    Effect.provide(Dns.layerStatic({
      hosts: {
        "db.internal": [ip("10.0.0.5"), ip("fd00::5")],
        "printer.local": [ip("fe80::1"), ip("169.254.0.7")]
      }
    })),
    Effect.orDie
  )

describe("AddressResolver", () => {
  it.effect("returns concrete addresses without a lookup", () =>
    Effect.gen(function*() {
      const resolve = yield* resolver()
      const inet = NetAddress.inetAddressFromStringUnsafe("10.0.0.1:80")
      assert.deepStrictEqual(yield* resolve.resolve(inet), [inet])
      const unix = NetAddress.unixPathAddress("/run/app.sock")
      assert.deepStrictEqual(yield* resolve.resolve(unix), [unix])
      const error = yield* Effect.flip(resolve.resolve(inet, { family: "IPv6" }))
      assert.strictEqual(error._tag, "NetAddressError")
    }))

  it.effect("looks up domain names and attaches the port", () =>
    Effect.gen(function*() {
      const resolve = yield* resolver()
      const all = yield* resolve.resolve(endpoint("db.internal:5432"))
      assert.deepStrictEqual(all.map(NetAddress.formatInet), ["10.0.0.5:5432", "[fd00::5]:5432"])
      const v4 = yield* resolve.resolve(endpoint("db.internal:5432"), { family: "IPv4" })
      assert.deepStrictEqual(v4.map(NetAddress.formatInet), ["10.0.0.5:5432"])
    }))

  it.effect("skips looked-up IPv6 link-local addresses, which have no scope", () =>
    Effect.gen(function*() {
      const resolve = yield* resolver()
      const addresses = yield* resolve.resolve(endpoint("printer.local:631"))
      assert.deepStrictEqual(addresses.map(NetAddress.formatInet), ["169.254.0.7:631"])
    }))

  it.effect("resolves named IPv6 zones with the scope ID lookup", () =>
    Effect.gen(function*() {
      const resolve = yield* resolver({
        scopeId: (name) => Effect.succeed(name === "eth0" ? Option.some(2) : Option.none())
      })
      const named = yield* resolve.resolve(endpoint("[fe80::1%eth0]:80"))
      assert.deepStrictEqual(named.map(NetAddress.formatInet), ["[fe80::1%2]:80"])
      const unknown = yield* Effect.flip(resolve.resolve(endpoint("[fe80::1%wlan0]:80")))
      assert.strictEqual(unknown._tag, "NetAddressError")
      const withoutLookup = yield* resolver()
      const error = yield* Effect.flip(withoutLookup.resolve(endpoint("[fe80::1%eth0]:80")))
      assert.strictEqual(error._tag, "NetAddressError")
    }))
})
