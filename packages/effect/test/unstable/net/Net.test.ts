import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash, Option, Result, Schema } from "effect"
import * as Net from "effect/unstable/net/Net"

const success = <A>(result: Result.Result<A, unknown>): A => {
  if (Result.isFailure(result)) assert.fail("expected Success")
  return result.success
}

const failure = (result: Result.Result<unknown, unknown>): void => {
  assert.isTrue(Result.isFailure(result))
}

describe("Net", () => {
  describe("IPv4", () => {
    it("parses strict dotted decimal", () => {
      assert.strictEqual(Net.formatIp(success(Net.ipv4FromString("1.2.3.4"))), "1.2.3.4")
      assert.deepStrictEqual(Net.ipv4ToOctets(success(Net.ipv4FromOctets(127, 0, 0, 1))), [127, 0, 0, 1])
    })

    it("rejects malformed inputs", () => {
      for (
        const input of [
          "",
          "127.1",
          "127.0.0.1.2",
          ".1.2.3",
          "1..2.3",
          "-1.2.3.4",
          "+1.2.3.4",
          " 1.2.3.4",
          "01.2.3.4",
          "001.002.003.004",
          "0x7f.0.0.1",
          "256.0.0.1"
        ]
      ) {
        failure(Net.ipv4FromString(input))
      }
      failure(Net.ipv4FromOctets(0, 0, 0, 256))
      failure(Net.ipv4FromOctets(0, 0, 0, 1.5))
    })
  })

  describe("IPv6", () => {
    const cases = [
      ["0:0:0:0:0:0:0:0", "::"],
      ["0:0:0:0:0:0:0:1", "::1"],
      ["2001:0DB8:0000:0000:0001:0000:0000:0001", "2001:db8::1:0:0:1"],
      ["2001:db8:0:1:0:0:0:1", "2001:db8:0:1::1"],
      ["2001:0:0:1:0:0:1:1", "2001::1:0:0:1:1"],
      ["::ffff:192.0.2.128", "::ffff:192.0.2.128"],
      ["::192.0.2.128", "::c000:280"],
      ["2001:db8::192.0.2.1", "2001:db8::c000:201"]
    ] as const

    it("uses canonical compression and embedded IPv4 policy", () => {
      for (const [input, expected] of cases) {
        const parsed = success(Net.ipv6FromString(input))
        assert.strictEqual(Net.formatIp(parsed), expected)
        assert.isTrue(Equal.equals(parsed, success(Net.ipv6FromString(expected))))
      }
    })

    it("rejects malformed inputs", () => {
      for (
        const input of [
          "",
          ":",
          ":::1",
          "1::2::3",
          "1:2:3:4:5:6:7",
          "1:2:3:4:5:6:7:8:9",
          "1:2:3:4:5:6:7:8::",
          "1:2:3:4:5:6:7::8",
          "gggg::1",
          "[::1]",
          "fe80::1%1",
          "::ffff:999.1.1.1",
          "::ffff:192.000.2.1",
          "::ffff:1.2.3",
          "192.0.2.1::"
        ]
      ) {
        failure(Net.ipv6FromString(input))
      }
      failure(Net.ipv6FromSegments(0, 0, 0, 0, 0, 0, 0, 65536))
    })

    it("round trips constructed numeric values", () => {
      const values = [
        success(Net.ipv6FromSegments(0, 0, 0, 0, 0, 0, 0, 0)),
        success(Net.ipv6FromSegments(0x2001, 0xdb8, 0, 1, 2, 3, 4, 5)),
        success(Net.ipv6FromSegments(0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff))
      ]
      for (const value of values) {
        const encoded = Net.formatIp(value)
        assert.isTrue(Equal.equals(success(Net.ipv6FromString(encoded)), value))
      }
    })

    it("uses numeric equality and hash laws", () => {
      const expanded = success(Net.ipv6FromString("2001:db8:0:0:0:0:0:1"))
      const compressed = success(Net.ipv6FromString("2001:db8::1"))
      assert.isTrue(Equal.equals(expanded, compressed))
      assert.strictEqual(Hash.hash(expanded), Hash.hash(compressed))
    })

    it("converts mapped IPv4 addresses", () => {
      const ipv4 = success(Net.ipv4FromString("192.0.2.128"))
      const mapped = Net.toIpv4Mapped(ipv4)
      assert.isTrue(Net.isIpv4Mapped(mapped))
      assert.strictEqual(Net.formatIp(mapped), "::ffff:192.0.2.128")
      assert.isTrue(Equal.equals(Option.getOrThrow(Net.fromIpv4Mapped(mapped)), ipv4))
      assert.isTrue(Option.isNone(Net.fromIpv4Mapped(success(Net.ipv6FromString("::1")))))
      assert.isTrue(Equal.equals(Net.toCanonical(mapped), ipv4))
      assert.isTrue(Equal.equals(Net.toCanonical(ipv4), ipv4))
    })

    it("returns IPv6 octets", () => {
      assert.deepStrictEqual(Net.ipv6ToOctets(success(Net.ipv6FromString("2001:db8::1"))), [
        0x20,
        0x01,
        0x0d,
        0xb8,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1
      ])
    })
  })

  it("classifies documented address ranges at their boundaries", () => {
    const ip = (text: string) => success(Net.ipFromString(text))
    assert.isTrue(Net.isUnspecified(ip("0.0.0.0")))
    assert.isTrue(Net.isUnspecified(ip("::")))
    assert.isTrue(Net.isLoopback(ip("127.255.255.255")))
    assert.isFalse(Net.isLoopback(ip("128.0.0.0")))
    assert.isTrue(Net.isMulticast(ip("224.0.0.0")))
    assert.isFalse(Net.isMulticast(ip("223.255.255.255")))
    assert.isTrue(Net.isMulticast(ip("ff00::")))
    assert.isTrue(Net.isBroadcast(Net.ipv4Broadcast))
    assert.isFalse(Net.isBroadcast(success(Net.ipv4FromString("255.255.255.254"))))
    assert.isTrue(Net.isLinkLocal(ip("169.254.255.255")))
    assert.isFalse(Net.isLinkLocal(ip("169.255.0.0")))
    assert.isTrue(Net.isLinkLocal(ip("febf::")))
    assert.isFalse(Net.isLinkLocal(ip("fec0::")))
    assert.isTrue(Net.isPrivate(success(Net.ipv4FromString("10.255.255.255"))))
    assert.isTrue(Net.isPrivate(success(Net.ipv4FromString("172.31.255.255"))))
    assert.isTrue(Net.isPrivate(success(Net.ipv4FromString("192.168.0.0"))))
    assert.isFalse(Net.isPrivate(success(Net.ipv4FromString("172.32.0.0"))))
    assert.isTrue(Net.isUniqueLocal(success(Net.ipv6FromString("fc00::"))))
    assert.isTrue(Net.isUniqueLocal(success(Net.ipv6FromString("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"))))
    assert.isFalse(Net.isUniqueLocal(success(Net.ipv6FromString("fe00::"))))
    assert.isTrue(Equal.equals(Net.ipv4Unspecified, ip("0.0.0.0")))
    assert.isTrue(Equal.equals(Net.ipv6Unspecified, ip("::")))
  })

  it("constructs immutable address values", () => {
    const ipv4 = success(Net.ipv4FromString("127.0.0.1"))
    const ipv6 = success(Net.ipv6FromString("::1"))
    const inet4 = success(Net.inetAddressV4(ipv4, 80))
    const inet6 = success(Net.inetAddressV6(ipv6, 80, { flowInfo: 1, scopeId: 2 }))
    const unix = Net.unixPathAddress("server.sock")

    for (const address of [ipv4, ipv6, inet4, inet6, unix]) {
      assert.isTrue(Object.isFrozen(address))
    }
  })

  describe("socket addresses", () => {
    it("parses and formats bracketed numeric addresses", () => {
      assert.strictEqual(Net.formatInet(success(Net.inetAddressFromString("127.0.0.1:8080"))), "127.0.0.1:8080")
      assert.strictEqual(Net.formatInet(success(Net.inetAddressFromString("[0:0:0:0:0:0:0:1]:8080"))), "[::1]:8080")
      assert.strictEqual(Net.formatInet(success(Net.inetAddressFromIpString("::1", 8080))), "[::1]:8080")
      assert.strictEqual(Net.formatUrlHost(success(Net.ipv6FromString("::1"))), "[::1]")
    })

    it("provides throwing counterparts for trusted construction", () => {
      const ip = Net.ipFromStringUnsafe("::1")
      assert.strictEqual(Net.formatIp(ip), "::1")
      assert.strictEqual(Net.formatInet(Net.inetAddressUnsafe(ip, 8080)), "[::1]:8080")
      assert.strictEqual(Net.formatInet(Net.inetAddressFromStringUnsafe("127.0.0.1:8080")), "127.0.0.1:8080")
      assert.throws(() => Net.ipFromStringUnsafe("localhost"))
      assert.throws(() => Net.inetAddressUnsafe(ip, -1))
      assert.throws(() => Net.inetAddressFromStringUnsafe("localhost:8080"))
    })

    it("checks port boundaries and rejects ambiguous input", () => {
      for (const port of [0, 1, 65535]) {
        assert.strictEqual(success(Net.inetAddressFromString(`127.0.0.1:${port}`)).port, port)
      }
      for (
        const input of [
          "127.0.0.1:-1",
          "127.0.0.1:65536",
          "127.0.0.1:1.5",
          "localhost:80",
          "::1:80",
          "[::1]80",
          "[127.0.0.1]:80",
          "[fe80::1%]:80",
          "[fe80::1%-1]:80",
          "[fe80::1%1.5]:80",
          "[fe80::1%en0]:80",
          "[fe80::1%1%2]:80",
          "[fe80::1%4294967296]:80"
        ]
      ) {
        failure(Net.inetAddressFromString(input))
      }
    })

    it("preserves IPv6 flow and scope metadata in equality and hashing", () => {
      const address = success(Net.ipv6FromString("fe80::1"))
      const first = success(Net.inetAddressV6(address, 80, { flowInfo: 2, scopeId: 3 }))
      const second = success(Net.inetAddressV6(address, 80, { flowInfo: 2, scopeId: 3 }))
      const otherScope = success(Net.inetAddressV6(address, 80, { flowInfo: 2, scopeId: 4 }))
      assert.isTrue(Equal.equals(first, second))
      assert.strictEqual(Hash.hash(first), Hash.hash(second))
      assert.isFalse(Equal.equals(first, otherScope))
    })

    it("round trips numeric IPv6 scope identifiers", () => {
      const scoped = success(Net.inetAddressFromString("[fe80::1%4294967295]:65535"))
      if (!Net.isInetAddressV6(scoped)) assert.fail("expected InetAddressV6")
      assert.strictEqual(scoped.scopeId, 0xffffffff)
      assert.strictEqual(scoped.flowInfo, 0)
      assert.strictEqual(Net.formatInet(scoped), "[fe80::1%4294967295]:65535")
      assert.strictEqual(Net.formatInet(success(Net.inetAddressFromString("[fe80::1%0]:80"))), "[fe80::1]:80")
    })

    it("keeps Unix paths opaque", () => {
      const address = Net.unixPathAddress("./run/../server.sock")
      assert.strictEqual(address.path, "./run/../server.sock")
      assert.strictEqual(Net.formatSocketAddress(address), "./run/../server.sock")
      assert.isTrue(Equal.equals(address, Net.unixPathAddress("./run/../server.sock")))
    })
  })

  it("decodes and canonically encodes schemas", () => {
    const ipv6 = Schema.decodeUnknownSync(Schema.Ipv6AddressFromString)("2001:0DB8:0:0:0:0:0:1")
    assert.strictEqual(Schema.encodeSync(Schema.Ipv6AddressFromString)(ipv6), "2001:db8::1")
    const inet = Schema.decodeUnknownSync(Schema.InetAddressFromString)("[0:0:0:0:0:0:0:1]:0")
    assert.strictEqual(Schema.encodeSync(Schema.InetAddressFromString)(inet), "[::1]:0")
    const scoped = Schema.decodeUnknownSync(Schema.InetAddressFromString)("[fe80::1%3]:80")
    assert.strictEqual(Schema.encodeSync(Schema.InetAddressFromString)(scoped), "[fe80::1%3]:80")
    const unix = Schema.decodeUnknownSync(Schema.UnixPathAddressFromString)("../opaque.sock")
    assert.strictEqual(Schema.encodeSync(Schema.UnixPathAddressFromString)(unix), "../opaque.sock")
    assert.throws(() => Schema.decodeUnknownSync(Schema.Ipv4AddressFromString)("999.0.0.1"))
  })
})
