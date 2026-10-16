import { assert, describe, it } from "@effect/vitest"
import { Config, ConfigProvider, Effect, Equal, Schema } from "effect"
import * as Host from "effect/net/Host"
import * as IpNetwork from "effect/net/IpNetwork"
import * as NetAddress from "effect/net/NetAddress"

const declarations = [
  Schema.MacAddress,
  Schema.Ipv4Address,
  Schema.Ipv6Address,
  Schema.IpAddress,
  Schema.Ipv4Interface,
  Schema.Ipv6Interface,
  Schema.IpInterface,
  Schema.Ipv4Network,
  Schema.Ipv6Network,
  Schema.IpNetwork,
  Schema.InetAddressV4,
  Schema.InetAddressV6,
  Schema.InetAddress,
  Schema.UnixPathAddress,
  Schema.SocketAddress,
  Schema.HostPort,
  Schema.Host
] as const

describe("effect/net schemas", () => {
  it("encode canonical strings through the JSON codec", () => {
    const cases: ReadonlyArray<readonly [Schema.Top, string, string]> = [
      [Schema.MacAddress, "02:0A:0b:0C:0d:0E", "02:0a:0b:0c:0d:0e"],
      [Schema.Ipv4Address, "192.0.2.1", "192.0.2.1"],
      [Schema.Ipv6Address, "2001:0DB8:0:0:0:0:0:1", "2001:db8::1"],
      [Schema.IpAddress, "::FFFF:192.0.2.1", "::ffff:192.0.2.1"],
      [Schema.IpMulticastAddress, "239.255.0.1", "239.255.0.1"],
      [Schema.Ipv4Interface, "192.0.2.1", "192.0.2.1/32"],
      [Schema.Ipv6Interface, "FE80::1/64", "fe80::1/64"],
      [Schema.IpInterface, "192.0.2.1/24", "192.0.2.1/24"],
      [Schema.Ipv4Network, "192.0.2.0/24", "192.0.2.0/24"],
      [Schema.Ipv6Network, "2001:DB8::/32", "2001:db8::/32"],
      [Schema.IpNetwork, "10.0.0.0/8", "10.0.0.0/8"],
      [Schema.InetAddressV4, "192.0.2.1:80", "192.0.2.1:80"],
      [Schema.InetAddressV6, "[fe80::1%3]:443", "[fe80::1%3]:443"],
      [Schema.InetAddress, "[0:0:0:0:0:0:0:1]:0", "[::1]:0"],
      [Schema.UnixPathAddress, "../opaque.sock", "../opaque.sock"],
      [Schema.UnixPathAddress, "unix:///tmp/x", "unix:///tmp/x"],
      [Schema.SocketAddress, "127.0.0.1:80", "127.0.0.1:80"],
      [Schema.SocketAddress, "unix:///var/run/docker.sock", "unix:///var/run/docker.sock"],
      [Schema.SocketAddress, "unix://127.0.0.1:80", "unix://127.0.0.1:80"],
      [Schema.HostPort, "DB.internal:5432", "db.internal:5432"],
      [Schema.HostPort, "[fe80::1%eth0]:80", "[fe80::1%eth0]:80"],
      [Schema.HostPort, "bücher.example:80", "xn--bcher-kva.example:80"],
      [Schema.Host, "example.com", "example.com"],
      [Schema.Host, "2001:db8::1", "2001:db8::1"]
    ]
    for (const [schema, input, encoded] of cases) {
      const codec = Schema.toCodecJson(schema)
      const value = Schema.decodeUnknownSync(codec)(input)
      assert.isTrue(Schema.is(schema)(value), input)
      assert.strictEqual(Schema.encodeSync(codec)(value), encoded)
    }
  })

  it("reject strings outside the schema through the JSON codec", () => {
    const cases: ReadonlyArray<readonly [Schema.Top, string, string]> = [
      [Schema.Ipv4Address, "999.0.0.1", "octet"],
      [Schema.IpMulticastAddress, "127.0.0.1", "Expected a multicast address"],
      [Schema.Ipv4Network, "192.0.2.1/24", "address has non-zero host bits"],
      [Schema.InetAddressV4, "[::1]:80", "expected an IPv4 address:port"],
      [Schema.InetAddressV6, "192.0.2.1:80", "expected [IPv6]:port"],
      [Schema.SocketAddress, "/var/run/docker.sock", "Unix-domain addresses must start with unix://"],
      [Schema.SocketAddress, "localhost:80", "Unix-domain addresses must start with unix://"],
      [Schema.HostPort, "db.internal", "expected host:port"],
      [Schema.Host, "Example.com", "Expected a normalized domain name"]
    ]
    for (const [schema, input, message] of cases) {
      assert.throws(() => Schema.decodeUnknownSync(Schema.toCodecJson(schema))(input), message)
    }
  })

  it.effect("read values from configuration", () =>
    Effect.gen(function*() {
      const provider = ConfigProvider.fromUnknown({
        endpoint: "db.internal:5432",
        socket: "unix:///var/run/docker.sock",
        network: "10.0.0.0/8"
      })
      const endpoint = yield* Config.schema(Schema.HostPort, "endpoint").parse(provider)
      const socket = yield* Config.schema(Schema.SocketAddress, "socket").parse(provider)
      const network = yield* Config.schema(Schema.IpNetwork, "network").parse(provider)
      assert.isTrue(Equal.equals(endpoint, Host.hostPortFromStringUnsafe("db.internal:5432")))
      assert.isTrue(Equal.equals(socket, NetAddress.unixPathAddress("/var/run/docker.sock")))
      assert.isTrue(Equal.equals(network, IpNetwork.fromStringUnsafe("10.0.0.0/8")))
    }))

  for (const schema of declarations) {
    const name = Schema.resolveAnnotations(schema)?.identifier
    it.prop(
      `${name} round-trips generated values through the JSON and StringTree codecs`,
      { value: schema },
      ({ value }) => {
        const equivalence = Schema.toEquivalence(schema)
        for (const codec of [Schema.toCodecJson(schema), Schema.toCodecStringTree(schema)]) {
          const encoded = Schema.encodeUnknownSync(codec)(value)
          assert.isString(encoded)
          assert.isTrue(equivalence(value, Schema.decodeUnknownSync(codec)(encoded)))
        }
      }
    )
  }
})
