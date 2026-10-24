import { assert, describe, it } from "@effect/vitest"
import { Arbitrary, Config, ConfigProvider, Effect, Schema } from "effect"

describe("effect/net schemas", () => {
  it("encode canonical strings", () => {
    const cases: ReadonlyArray<readonly [Schema.Codec<unknown>, string, string]> = [
      [Schema.MacAddress, "02:0A:0b:0C:0d:0E", "02:0a:0b:0c:0d:0e"],
      [Schema.IpAddress, "2001:0DB8:0:0:0:0:0:1", "2001:db8::1"],
      [Schema.IpInterface, "192.0.2.1", "192.0.2.1/32"],
      [Schema.IpNetwork, "2001:DB8::/32", "2001:db8::/32"],
      [Schema.InetAddress, "[fe80::1%3]:443", "[fe80::1%3]:443"],
      [Schema.UnixPathAddress, "../opaque.sock", "../opaque.sock"],
      [Schema.SocketAddress, "unix://127.0.0.1:80", "unix://127.0.0.1:80"],
      [Schema.HostPort, "DB.internal:5432", "db.internal:5432"]
    ]
    for (const [schema, input, encoded] of cases) {
      const codec = Schema.toCodecJson(schema)
      assert.strictEqual(Schema.encodeSync(codec)(Schema.decodeUnknownSync(codec)(input)), encoded)
    }
  })

  it("reject invalid strings", () => {
    const cases: ReadonlyArray<readonly [Schema.Codec<unknown>, string, string]> = [
      [Schema.IpMulticastAddress, "127.0.0.1", "Expected a multicast address"],
      [Schema.Ipv4Network, "192.0.2.1/24", "address has non-zero host bits"],
      [Schema.InetAddressV4, "[::1]:80", "expected an IPv4 address:port"],
      [Schema.SocketAddress, "/var/run/docker.sock", "Unix-domain addresses must start with unix://"],
      [Schema.HostPort, "db.internal", "expected host:port"]
    ]
    for (const [schema, input, message] of cases) {
      assert.throws(() => Schema.decodeUnknownSync(Schema.toCodecJson(schema))(input), message)
    }
  })

  it.effect("read values from configuration", () =>
    Effect.gen(function*() {
      const provider = ConfigProvider.fromUnknown({
        endpoint: "db.internal:5432",
        socket: "unix:///var/run/docker.sock"
      })
      const endpoint = yield* Config.schema(Schema.HostPort, "endpoint").parse(provider)
      const socket = yield* Config.schema(Schema.SocketAddress, "socket").parse(provider)
      assert.strictEqual(String(endpoint), "db.internal:5432")
      assert.strictEqual(String(socket), "/var/run/docker.sock")
    }))

  it.effect("generate refined addresses without discards", () =>
    Effect.gen(function*() {
      const schemas: ReadonlyArray<Schema.Codec<unknown>> = [
        Schema.IpMulticastAddress,
        Schema.IpMulticastAddressFromString,
        Schema.MacMulticastAddress,
        Schema.MacMulticastAddressFromString,
        Schema.MacUnicastAddress,
        Schema.MacUnicastAddressFromString,
        Schema.Ipv4BroadcastAddress,
        Schema.Ipv4BroadcastAddressFromString,
        Schema.MacBroadcastAddress,
        Schema.MacBroadcastAddressFromString,
        Schema.IpLoopbackAddress,
        Schema.IpLoopbackAddressFromString,
        Schema.IpLinkLocalAddress,
        Schema.IpLinkLocalAddressFromString,
        Schema.IpUnspecifiedAddress,
        Schema.IpUnspecifiedAddressFromString,
        Schema.Ipv4PrivateAddress,
        Schema.Ipv4PrivateAddressFromString,
        Schema.Ipv6UniqueLocalAddress,
        Schema.Ipv6UniqueLocalAddressFromString,
        Schema.MacLocallyAdministeredAddress,
        Schema.MacLocallyAdministeredAddressFromString,
        Schema.MacUniversallyAdministeredAddress,
        Schema.MacUniversallyAdministeredAddressFromString
      ]
      for (const schema of schemas) {
        const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(schema), { count: 100, maxDiscards: 0, seed: 42 })
        assert.isTrue(values.every(Schema.is(schema)))
      }
    }))

  const schemas: Record<string, Schema.Codec<unknown>> = {
    MacAddress: Schema.MacAddress,
    IpAddress: Schema.IpAddress,
    IpInterface: Schema.IpInterface,
    IpNetwork: Schema.IpNetwork,
    InetAddress: Schema.InetAddress,
    UnixPathAddress: Schema.UnixPathAddress,
    SocketAddress: Schema.SocketAddress,
    HostPort: Schema.HostPort
  }
  for (const [name, schema] of Object.entries(schemas)) {
    it.prop(`${name} round-trips through JSON and StringTree`, { value: schema }, ({ value }) => {
      const equivalence = Schema.toEquivalence(schema)
      for (const codec of [Schema.toCodecJson(schema), Schema.toCodecStringTree(schema)]) {
        assert.isTrue(equivalence(value, Schema.decodeUnknownSync(codec)(Schema.encodeUnknownSync(codec)(value))))
      }
    })
  }
})
