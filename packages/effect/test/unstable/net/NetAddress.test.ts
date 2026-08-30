import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash, Option, Result, Schema } from "effect"
import * as NetAddress from "effect/unstable/net/NetAddress"

const success = <A>(result: Result.Result<A, unknown>): A => {
  if (Result.isFailure(result)) assert.fail("expected Success")
  return result.success
}

const failure = <E>(result: Result.Result<unknown, E>): E => {
  if (Result.isSuccess(result)) assert.fail("expected Failure")
  return result.failure
}

describe("NetAddress", () => {
  describe("IPv4", () => {
    it("parses strict dotted decimal", () => {
      assert.strictEqual(NetAddress.formatIp(success(NetAddress.ipv4FromString("1.2.3.4"))), "1.2.3.4")
      assert.deepStrictEqual(NetAddress.ipv4ToOctets(success(NetAddress.ipv4FromOctets(127, 0, 0, 1))), [127, 0, 0, 1])
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
        failure(NetAddress.ipv4FromString(input))
      }
      failure(NetAddress.ipv4FromOctets(0, 0, 0, 256))
      failure(NetAddress.ipv4FromOctets(0, 0, 0, 1.5))
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
        const parsed = success(NetAddress.ipv6FromString(input))
        assert.strictEqual(NetAddress.formatIp(parsed), expected)
        assert.isTrue(Equal.equals(parsed, success(NetAddress.ipv6FromString(expected))))
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
        failure(NetAddress.ipv6FromString(input))
      }
      failure(NetAddress.ipv6FromSegments(0, 0, 0, 0, 0, 0, 0, 65536))
    })

    it("round trips constructed numeric values", () => {
      const values = [
        success(NetAddress.ipv6FromSegments(0, 0, 0, 0, 0, 0, 0, 0)),
        success(NetAddress.ipv6FromSegments(0x2001, 0xdb8, 0, 1, 2, 3, 4, 5)),
        success(NetAddress.ipv6FromSegments(0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff))
      ]
      for (const value of values) {
        const encoded = NetAddress.formatIp(value)
        assert.isTrue(Equal.equals(success(NetAddress.ipv6FromString(encoded)), value))
      }
    })

    it("uses numeric equality and hash laws", () => {
      const expanded = success(NetAddress.ipv6FromString("2001:db8:0:0:0:0:0:1"))
      const compressed = success(NetAddress.ipv6FromString("2001:db8::1"))
      assert.isTrue(Equal.equals(expanded, compressed))
      assert.strictEqual(Hash.hash(expanded), Hash.hash(compressed))
    })

    it("converts mapped IPv4 addresses", () => {
      const ipv4 = success(NetAddress.ipv4FromString("192.0.2.128"))
      const mapped = NetAddress.toIpv4Mapped(ipv4)
      assert.isTrue(NetAddress.isIpv4Mapped(mapped))
      assert.strictEqual(NetAddress.formatIp(mapped), "::ffff:192.0.2.128")
      assert.isTrue(Equal.equals(Option.getOrThrow(NetAddress.fromIpv4Mapped(mapped)), ipv4))
      assert.isTrue(Option.isNone(NetAddress.fromIpv4Mapped(success(NetAddress.ipv6FromString("::1")))))
      assert.isTrue(Equal.equals(NetAddress.toCanonical(mapped), ipv4))
      assert.isTrue(Equal.equals(NetAddress.toCanonical(ipv4), ipv4))
    })

    it("returns IPv6 octets", () => {
      assert.deepStrictEqual(NetAddress.ipv6ToOctets(success(NetAddress.ipv6FromString("2001:db8::1"))), [
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

  describe("MAC", () => {
    it("parses and canonically formats six octets", () => {
      const address = success(NetAddress.macAddressFromString("02:0A:0b:0C:0d:0E"))
      assert.strictEqual(NetAddress.formatMacAddress(address), "02:0a:0b:0c:0d:0e")
      const octets = NetAddress.macAddressToOctets(address)
      assert.deepStrictEqual(octets, [2, 10, 11, 12, 13, 14])
      Reflect.set(octets, 0, 0xff)
      assert.strictEqual(NetAddress.formatMacAddress(address), "02:0a:0b:0c:0d:0e")
      assert.isTrue(NetAddress.isMacAddress(address))
      assert.isTrue(Equal.equals(address, success(NetAddress.macAddressFromOctets(2, 10, 11, 12, 13, 14))))
      assert.strictEqual(Hash.hash(address), Hash.hash(success(NetAddress.macAddressFromString("02:0a:0b:0c:0d:0e"))))
    })

    it("rejects malformed inputs and invalid octets", () => {
      for (
        const input of [
          "",
          "00:11:22:33:44",
          "00:11:22:33:44:55:66",
          "0:11:22:33:44:55",
          "00-11-22-33-44-55",
          "0011.2233.4455",
          "gg:11:22:33:44:55"
        ]
      ) {
        failure(NetAddress.macAddressFromString(input))
      }
      failure(NetAddress.macAddressFromOctets(0, 0, 0, 0, 0, 256))
      failure(NetAddress.macAddressFromOctets(0, 0, 0, 0, 0, 1.5))
      assert.throws(() => NetAddress.macAddressFromStringUnsafe("invalid"))
    })

    it("classifies address bits", () => {
      const mac = (text: string) => success(NetAddress.macAddressFromString(text))
      assert.isTrue(NetAddress.isMacBroadcast(mac("ff:ff:ff:ff:ff:ff")))
      assert.isTrue(NetAddress.isMacMulticast(mac("01:00:5e:00:00:01")))
      assert.isFalse(NetAddress.isMacUnicast(mac("01:00:5e:00:00:01")))
      assert.isTrue(NetAddress.isMacUnicast(mac("00:00:5e:00:53:01")))
      assert.isTrue(NetAddress.isMacLocallyAdministered(mac("02:00:00:00:00:01")))
      assert.isFalse(NetAddress.isMacUniversallyAdministered(mac("02:00:00:00:00:01")))
      assert.isTrue(NetAddress.isMacUniversallyAdministered(mac("00:00:5e:00:53:01")))
    })
  })

  describe("Hostname", () => {
    it("canonicalizes ASCII hostnames and preserves an absolute terminal dot", () => {
      const cases = [
        ["Example.COM", "example.com"],
        ["localhost", "localhost"],
        ["3example.test", "3example.test"],
        ["Example.COM.", "example.com."]
      ] as const
      for (const [input, expected] of cases) {
        assert.strictEqual(NetAddress.formatHostname(success(NetAddress.hostnameFromString(input))), expected)
      }
      assert.strictEqual(NetAddress.hostnameFromStringUnsafe("Example.COM").toString(), "example.com")
    })

    it("enforces label and wire lengths", () => {
      const label63 = "a".repeat(63)
      const longest = `${label63}.${label63}.${label63}.${"a".repeat(61)}`
      assert.strictEqual(NetAddress.formatHostname(success(NetAddress.hostnameFromString(longest))), longest)
      assert.strictEqual(NetAddress.formatHostname(success(NetAddress.hostnameFromString(`${longest}.`))), `${longest}.`)
      assert.strictEqual(failure(NetAddress.hostnameFromString("a".repeat(64))).reason, "InvalidLength")
      assert.strictEqual(
        failure(NetAddress.hostnameFromString(`${label63}.${label63}.${label63}.${label63}`)).reason,
        "InvalidLength"
      )
    })

    it("rejects non-host DNS and unsupported IDNA syntax", () => {
      for (
        const input of [
          "",
          ".",
          "a..b",
          "-example.com",
          "example-.com",
          "_sip._tcp.example.com",
          "example com",
          "xn--fa-hia.de",
          "faß.de",
          "example.com。",
          "example.com:80",
          "[::1]"
        ]
      ) {
        failure(NetAddress.hostnameFromString(input))
      }
    })

    it("uses canonical equality, hashing, guards, and immutable values", () => {
      const mixedCase = success(NetAddress.hostnameFromString("Example.COM"))
      const lowercase = success(NetAddress.hostnameFromString("example.com"))
      assert.isTrue(Equal.equals(mixedCase, lowercase))
      assert.strictEqual(Hash.hash(mixedCase), Hash.hash(lowercase))
      assert.isTrue(NetAddress.isHostname(mixedCase))
      assert.isTrue(NetAddress.isHost(mixedCase))
      assert.isFalse(NetAddress.isHostname({ _tag: "Hostname", ascii: "example.com" }))
      assert.isTrue(Object.isFrozen(mixedCase))
      assert.isFalse(
        Equal.equals(
          success(NetAddress.hostnameFromString("example.com")),
          success(NetAddress.hostnameFromString("example.com."))
        )
      )
    })
  })

  describe("Host", () => {
    it("parses hostnames and strict numeric addresses", () => {
      assert.isTrue(NetAddress.isHostname(success(NetAddress.hostFromString("example.com"))))
      assert.isTrue(NetAddress.isIpv4Address(success(NetAddress.hostFromString("192.0.2.1"))))
      assert.isTrue(NetAddress.isIpv6Address(success(NetAddress.hostFromString("2001:db8::1"))))
      assert.strictEqual(NetAddress.formatHost(success(NetAddress.hostFromString("[2001:0DB8::1]"))), "2001:db8::1")
      assert.strictEqual(
        NetAddress.formatAuthorityHost(success(NetAddress.hostFromString("2001:db8::1"))),
        "[2001:db8::1]"
      )
    })

    it("rejects invalid and legacy numeric IPv4 forms", () => {
      assert.strictEqual(failure(NetAddress.hostFromString("127.1")).reason, "InvalidIpv4")
      for (const input of ["0", "0xffffffff", "0177.0.0.1", "0x7f.0.0.1", "1.2.3.999", "[127.0.0.1]"]) {
        failure(NetAddress.hostFromString(input))
      }
    })
  })

  describe("Authority", () => {
    it("parses and canonically formats hosts with optional ports", () => {
      const cases = [
        ["Example.COM", "example.com"],
        ["example.com:0", "example.com:0"],
        ["192.0.2.1:65535", "192.0.2.1:65535"],
        ["[2001:0DB8::1]", "[2001:db8::1]"],
        ["[2001:0DB8::1]:443", "[2001:db8::1]:443"]
      ] as const
      for (const [input, expected] of cases) {
        const parsed = success(NetAddress.authorityFromString(input))
        assert.strictEqual(NetAddress.formatAuthority(parsed), expected)
        assert.isTrue(Equal.equals(parsed, success(NetAddress.authorityFromString(expected))))
      }
    })

    it("rejects ambiguous or non-authority syntax", () => {
      for (
        const input of [
          "",
          "example.com:",
          "example.com:-1",
          "example.com:65536",
          "example.com:http",
          "user@example.com:80",
          "example.com/path",
          "example.com?query",
          "example.com#fragment",
          "2001:db8::1",
          "2001:db8::1:80",
          "[127.0.0.1]:80",
          "[::1",
          "[::1]extra",
          "[[::1]]:80"
        ]
      ) {
        failure(NetAddress.authorityFromString(input))
      }
      assert.strictEqual(failure(NetAddress.authority(NetAddress.ipv4Loopback, -1)).reason, "InvalidPort")
    })

    it("supports numeric conversion without resolving hostnames", () => {
      const inet = NetAddress.inetAddressFromStringUnsafe("[2001:db8::1]:443")
      const authority = NetAddress.authorityFromInetAddress(inet)
      assert.strictEqual(NetAddress.formatAuthority(authority), "[2001:db8::1]:443")
      assert.strictEqual(
        NetAddress.formatInet(success(NetAddress.inetAddressFromAuthority(authority))),
        "[2001:db8::1]:443"
      )
      failure(NetAddress.inetAddressFromAuthority(NetAddress.authorityFromStringUnsafe("example.com:443")))
      failure(NetAddress.inetAddressFromAuthority(NetAddress.authorityFromStringUnsafe("192.0.2.1")))
    })

    it("uses structural equality, hashing, guards, and immutable values", () => {
      const first = NetAddress.authorityFromStringUnsafe("EXAMPLE.com:443")
      const second = NetAddress.authorityFromStringUnsafe("example.com:443")
      assert.isTrue(Equal.equals(first, second))
      assert.strictEqual(Hash.hash(first), Hash.hash(second))
      assert.isTrue(NetAddress.isAuthority(first))
      assert.isFalse(NetAddress.isAuthority({ _tag: "Authority", host: second.host, port: 443 }))
      assert.isTrue(Object.isFrozen(first))
    })
  })

  it("classifies documented address ranges at their boundaries", () => {
    const ip = (text: string) => success(NetAddress.ipFromString(text))
    assert.isTrue(NetAddress.isUnspecified(ip("0.0.0.0")))
    assert.isTrue(NetAddress.isUnspecified(ip("::")))
    assert.isTrue(NetAddress.isLoopback(ip("127.255.255.255")))
    assert.isFalse(NetAddress.isLoopback(ip("128.0.0.0")))
    assert.isTrue(NetAddress.isMulticast(ip("224.0.0.0")))
    assert.isFalse(NetAddress.isMulticast(ip("223.255.255.255")))
    assert.isTrue(NetAddress.isMulticast(ip("ff00::")))
    assert.isTrue(NetAddress.isBroadcast(NetAddress.ipv4Broadcast))
    assert.isFalse(NetAddress.isBroadcast(success(NetAddress.ipv4FromString("255.255.255.254"))))
    assert.isTrue(NetAddress.isLinkLocal(ip("169.254.255.255")))
    assert.isFalse(NetAddress.isLinkLocal(ip("169.255.0.0")))
    assert.isTrue(NetAddress.isLinkLocal(ip("febf::")))
    assert.isFalse(NetAddress.isLinkLocal(ip("fec0::")))
    assert.isTrue(NetAddress.isPrivate(success(NetAddress.ipv4FromString("10.255.255.255"))))
    assert.isTrue(NetAddress.isPrivate(success(NetAddress.ipv4FromString("172.31.255.255"))))
    assert.isTrue(NetAddress.isPrivate(success(NetAddress.ipv4FromString("192.168.0.0"))))
    assert.isFalse(NetAddress.isPrivate(success(NetAddress.ipv4FromString("172.32.0.0"))))
    assert.isTrue(NetAddress.isUniqueLocal(success(NetAddress.ipv6FromString("fc00::"))))
    assert.isTrue(
      NetAddress.isUniqueLocal(success(NetAddress.ipv6FromString("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")))
    )
    assert.isFalse(NetAddress.isUniqueLocal(success(NetAddress.ipv6FromString("fe00::"))))
    assert.isTrue(Equal.equals(NetAddress.ipv4Unspecified, ip("0.0.0.0")))
    assert.isTrue(Equal.equals(NetAddress.ipv6Unspecified, ip("::")))
  })

  it("constructs immutable address values", () => {
    const ipv4 = success(NetAddress.ipv4FromString("127.0.0.1"))
    const ipv6 = success(NetAddress.ipv6FromString("::1"))
    const inet4 = success(NetAddress.inetAddressV4(ipv4, 80))
    const inet6 = success(NetAddress.inetAddressV6(ipv6, 80, { flowInfo: 1, scopeId: 2 }))
    const mac = success(NetAddress.macAddressFromString("00:00:5e:00:53:01"))
    const unix = NetAddress.unixPathAddress("server.sock")

    for (const address of [ipv4, ipv6, inet4, inet6, mac, unix]) {
      assert.isTrue(Object.isFrozen(address))
    }
  })

  it("discriminates addresses sharing the common type id", () => {
    assert.isTrue(NetAddress.isIpv4Address(NetAddress.ipv4Loopback))
    assert.isFalse(NetAddress.isIpv6Address(NetAddress.ipv4Loopback))
    assert.isFalse(NetAddress.isMacAddress(NetAddress.ipv4Loopback))
  })

  it("returns NetAddressError from checked operations", () => {
    const result = NetAddress.ipFromString("localhost")
    if (Result.isSuccess(result)) assert.fail("expected Failure")
    assert.instanceOf(result.failure, NetAddress.NetAddressError)
    assert.strictEqual(result.failure.message, "IpAddress: expected exactly four decimal octets")
  })

  describe("socket addresses", () => {
    it("parses and formats bracketed numeric addresses", () => {
      assert.strictEqual(
        NetAddress.formatInet(success(NetAddress.inetAddressFromString("127.0.0.1:8080"))),
        "127.0.0.1:8080"
      )
      assert.strictEqual(
        NetAddress.formatInet(success(NetAddress.inetAddressFromString("[0:0:0:0:0:0:0:1]:8080"))),
        "[::1]:8080"
      )
      assert.strictEqual(NetAddress.formatInet(success(NetAddress.inetAddressFromIpString("::1", 8080))), "[::1]:8080")
      assert.strictEqual(NetAddress.formatUrlHost(success(NetAddress.ipv6FromString("::1"))), "[::1]")
    })

    it("provides throwing counterparts for trusted construction", () => {
      const ip = NetAddress.ipFromStringUnsafe("::1")
      assert.strictEqual(NetAddress.formatIp(ip), "::1")
      assert.strictEqual(NetAddress.formatInet(NetAddress.inetAddressUnsafe(ip, 8080)), "[::1]:8080")
      assert.strictEqual(
        NetAddress.formatInet(NetAddress.inetAddressFromStringUnsafe("127.0.0.1:8080")),
        "127.0.0.1:8080"
      )
      assert.throws(() => NetAddress.ipFromStringUnsafe("localhost"))
      assert.throws(() => NetAddress.inetAddressUnsafe(ip, -1))
      assert.throws(() => NetAddress.inetAddressFromStringUnsafe("localhost:8080"))
    })

    it("checks port boundaries and rejects ambiguous input", () => {
      for (const port of [0, 1, 65535]) {
        assert.strictEqual(success(NetAddress.inetAddressFromString(`127.0.0.1:${port}`)).port, port)
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
        failure(NetAddress.inetAddressFromString(input))
      }
    })

    it("preserves IPv6 flow and scope metadata in equality and hashing", () => {
      const address = success(NetAddress.ipv6FromString("fe80::1"))
      const first = success(NetAddress.inetAddressV6(address, 80, { flowInfo: 2, scopeId: 3 }))
      const second = success(NetAddress.inetAddressV6(address, 80, { flowInfo: 2, scopeId: 3 }))
      const otherScope = success(NetAddress.inetAddressV6(address, 80, { flowInfo: 2, scopeId: 4 }))
      assert.isTrue(Equal.equals(first, second))
      assert.strictEqual(Hash.hash(first), Hash.hash(second))
      assert.isFalse(Equal.equals(first, otherScope))
    })

    it("round trips numeric IPv6 scope identifiers", () => {
      const scoped = success(NetAddress.inetAddressFromString("[fe80::1%4294967295]:65535"))
      if (!NetAddress.isInetAddressV6(scoped)) assert.fail("expected InetAddressV6")
      assert.strictEqual(scoped.scopeId, 0xffffffff)
      assert.strictEqual(scoped.flowInfo, 0)
      assert.strictEqual(NetAddress.formatInet(scoped), "[fe80::1%4294967295]:65535")
      assert.strictEqual(
        NetAddress.formatInet(success(NetAddress.inetAddressFromString("[fe80::1%0]:80"))),
        "[fe80::1]:80"
      )
    })

    it("keeps Unix paths opaque", () => {
      const address = NetAddress.unixPathAddress("./run/../server.sock")
      assert.strictEqual(address.path, "./run/../server.sock")
      assert.strictEqual(NetAddress.formatSocketAddress(address), "./run/../server.sock")
      assert.isTrue(Equal.equals(address, NetAddress.unixPathAddress("./run/../server.sock")))
    })
  })

  it("decodes and canonically encodes schemas", () => {
    const mac = Schema.decodeUnknownSync(Schema.MacAddressFromString)("02:0A:0b:0C:0d:0E")
    assert.strictEqual(Schema.encodeSync(Schema.MacAddressFromString)(mac), "02:0a:0b:0c:0d:0e")
    const ipv6 = Schema.decodeUnknownSync(Schema.Ipv6AddressFromString)("2001:0DB8:0:0:0:0:0:1")
    assert.strictEqual(Schema.encodeSync(Schema.Ipv6AddressFromString)(ipv6), "2001:db8::1")
    const inet = Schema.decodeUnknownSync(Schema.InetAddressFromString)("[0:0:0:0:0:0:0:1]:0")
    assert.strictEqual(Schema.encodeSync(Schema.InetAddressFromString)(inet), "[::1]:0")
    const scoped = Schema.decodeUnknownSync(Schema.InetAddressFromString)("[fe80::1%3]:80")
    assert.strictEqual(Schema.encodeSync(Schema.InetAddressFromString)(scoped), "[fe80::1%3]:80")
    const unix = Schema.decodeUnknownSync(Schema.UnixPathAddressFromString)("../opaque.sock")
    assert.strictEqual(Schema.encodeSync(Schema.UnixPathAddressFromString)(unix), "../opaque.sock")
    assert.throws(() => Schema.decodeUnknownSync(Schema.MacAddressFromString)("00-11-22-33-44-55"))
    const hostname = Schema.decodeUnknownSync(Schema.HostnameFromString)("Example.COM")
    assert.strictEqual(Schema.encodeSync(Schema.HostnameFromString)(hostname), "example.com")
    const host = Schema.decodeUnknownSync(Schema.HostFromString)("[2001:0DB8::1]")
    assert.strictEqual(Schema.encodeSync(Schema.HostFromString)(host), "2001:db8::1")
    const authority = Schema.decodeUnknownSync(Schema.AuthorityFromString)("[2001:0DB8::1]:443")
    assert.strictEqual(Schema.encodeSync(Schema.AuthorityFromString)(authority), "[2001:db8::1]:443")
    assert.throws(() => Schema.decodeUnknownSync(Schema.Hostname)({ _tag: "Hostname", ascii: "example.com" }))
    assert.throws(() => Schema.decodeUnknownSync(Schema.Ipv4AddressFromString)("999.0.0.1"))
  })
})
