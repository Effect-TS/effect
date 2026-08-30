import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash, Result, Schema } from "effect"
import * as IpNetwork from "effect/unstable/net/IpNetwork"
import * as Net from "effect/unstable/net/Net"
import * as fc from "fast-check"
import { inspect } from "node:util"

const success = <A>(result: Result.Result<A, unknown>): A => {
  if (Result.isFailure(result)) assert.fail("expected Success")
  return result.success
}

const failure = (result: Result.Result<unknown, unknown>): void => {
  assert.isTrue(Result.isFailure(result))
}

const ip = (input: string): Net.IpAddress => success(Net.ipFromString(input))
const network = (input: string): IpNetwork.IpNetwork => success(IpNetwork.fromString(input))

describe("IpNetwork", () => {
  it("constructs immutable canonical networks and preserves family identity", () => {
    const ipv4 = IpNetwork.makeUnsafe(Net.ipv4Unspecified, 0)
    const ipv6 = IpNetwork.makeUnsafe(Net.ipv6Unspecified, 0)
    assert.isTrue(Object.isFrozen(ipv4))
    assert.isTrue(Object.isFrozen(ipv6))
    assert.isTrue(IpNetwork.isIpv4Network(ipv4))
    assert.isTrue(IpNetwork.isIpv6Network(ipv6))
    assert.isTrue(IpNetwork.isIpNetwork(ipv4))
    assert.isFalse(Equal.equals(ipv4, ipv6))
    assert.strictEqual(ipv4.toString(), "0.0.0.0/0")
    assert.strictEqual(ipv6.toString(), "::/0")
    assert.strictEqual(inspect(ipv4), "0.0.0.0/0")
  })

  it("rejects invalid prefix lengths and host bits", () => {
    const ipv4 = ip("10.1.2.3")
    const ipv6 = ip("2001:db8::1")
    for (const prefix of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 33]) {
      failure(IpNetwork.make(ipv4, prefix))
      failure(IpNetwork.fromAddress(ipv4, prefix))
    }
    failure(IpNetwork.make(ipv6, 129))
    failure(IpNetwork.make(ipv4, 8))
    failure(IpNetwork.make(ipv6, 32))
  })

  it("explicitly truncates byte-aligned and partial-byte host addresses", () => {
    assert.strictEqual(IpNetwork.format(success(IpNetwork.fromAddress(ip("10.1.2.3"), 8))), "10.0.0.0/8")
    assert.strictEqual(IpNetwork.format(success(IpNetwork.fromAddress(ip("192.0.2.255"), 25))), "192.0.2.128/25")
    assert.strictEqual(
      IpNetwork.format(success(IpNetwork.fromAddress(ip("2001:db8:0:1:ffff::1"), 63))),
      "2001:db8::/63"
    )
    assert.strictEqual(
      IpNetwork.format(success(IpNetwork.fromAddress(ip("2001:db8:0:1:ffff::1"), 65))),
      "2001:db8:0:1:8000::/65"
    )
  })

  it("parses strict CIDR and formats canonical address text", () => {
    assert.strictEqual(IpNetwork.format(network("192.0.2.0/24")), "192.0.2.0/24")
    assert.strictEqual(
      IpNetwork.format(network("2001:0DB8:0000:0000:0000:0000:0000:0000/32")),
      "2001:db8::/32"
    )
    assert.strictEqual(IpNetwork.format(network("::ffff:192.0.2.0/120")), "::ffff:192.0.2.0/120")
  })

  it("rejects malformed and non-network CIDR input", () => {
    for (
      const input of [
        "1.2.3.4",
        "1.2.3.4/",
        "/24",
        "1.2.3.4/24/1",
        "1.2.3.4/+24",
        "1.2.3.4/024",
        "1.2.3.4/ 24",
        "1.2.3.4/24 ",
        "1.2.3.4/1.5",
        "1.2.3.4/1e1",
        "1.2.3.4/33",
        "10.1.2.3/8",
        "2001:db8::1/32",
        "[::]/0",
        "fe80::%1/64"
      ]
    ) {
      failure(IpNetwork.fromString(input))
    }
    failure(IpNetwork.ipv4FromString("::/0"))
    failure(IpNetwork.ipv6FromString("0.0.0.0/0"))
  })

  it("uses numeric equality and matching hashes", () => {
    const first = network("2001:0DB8:0:0:0:0:0:0/32")
    const second = network("2001:db8::/32")
    assert.isTrue(Equal.equals(first, second))
    assert.strictEqual(Hash.hash(first), Hash.hash(second))
    assert.isFalse(Equal.equals(first, network("2001:db8::/33")))
  })

  it("computes first, last, and exact address counts", () => {
    const ipv4All = network("0.0.0.0/0")
    const ipv6All = network("::/0")
    assert.strictEqual(Net.formatIp(IpNetwork.firstAddress(ipv4All)), "0.0.0.0")
    assert.strictEqual(Net.formatIp(IpNetwork.lastAddress(ipv4All)), "255.255.255.255")
    assert.strictEqual(IpNetwork.addressCount(ipv4All), BigInt(1) << BigInt(32))
    assert.strictEqual(Net.formatIp(IpNetwork.lastAddress(ipv6All)), "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")
    assert.strictEqual(IpNetwork.addressCount(ipv6All), BigInt(1) << BigInt(128))

    const ipv4Pair = network("192.0.2.0/31")
    assert.strictEqual(Net.formatIp(IpNetwork.lastAddress(ipv4Pair)), "192.0.2.1")
    assert.strictEqual(IpNetwork.addressCount(ipv4Pair), BigInt(2))
    const ipv6Pair = network("2001:db8::/127")
    assert.strictEqual(Net.formatIp(IpNetwork.lastAddress(ipv6Pair)), "2001:db8::1")
    assert.strictEqual(IpNetwork.addressCount(ipv6Pair), BigInt(2))

    const ipv4Host = network("255.255.255.255/32")
    assert.strictEqual(Net.formatIp(IpNetwork.lastAddress(ipv4Host)), "255.255.255.255")
    assert.strictEqual(IpNetwork.addressCount(ipv4Host), BigInt(1))
  })

  it("checks address containment in data-first and data-last forms", () => {
    const self = network("192.0.2.0/25")
    assert.isTrue(IpNetwork.contains(self, ip("192.0.2.0")))
    assert.isTrue(IpNetwork.contains(self, ip("192.0.2.64")))
    assert.isTrue(IpNetwork.contains(ip("192.0.2.127"))(self))
    assert.isFalse(IpNetwork.contains(self, ip("192.0.1.255")))
    assert.isFalse(IpNetwork.contains(self, ip("192.0.2.128")))
    assert.isFalse(IpNetwork.contains(self, ip("::ffff:192.0.2.1")))
  })

  it("checks network containment and overlap", () => {
    const parent = network("10.0.0.0/8")
    const child = network("10.1.0.0/16")
    const sibling = network("10.2.0.0/16")
    const disjoint = network("11.0.0.0/8")
    assert.isTrue(IpNetwork.containsNetwork(parent, parent))
    assert.isTrue(IpNetwork.containsNetwork(child)(parent))
    assert.isFalse(IpNetwork.containsNetwork(child, parent))
    assert.isTrue(IpNetwork.overlaps(parent, child))
    assert.isTrue(IpNetwork.overlaps(child, parent))
    assert.isFalse(IpNetwork.overlaps(child, sibling))
    assert.isFalse(IpNetwork.overlaps(parent, disjoint))
    assert.isFalse(IpNetwork.overlaps(parent, network("::/0")))
  })

  it("provides checked unsafe wrappers", () => {
    assert.strictEqual(IpNetwork.format(IpNetwork.fromAddressUnsafe(ip("10.1.2.3"), 8)), "10.0.0.0/8")
    assert.strictEqual(IpNetwork.format(IpNetwork.fromStringUnsafe("10.0.0.0/8")), "10.0.0.0/8")
    assert.throws(() => IpNetwork.makeUnsafe(ip("10.1.2.3"), 8))
    assert.throws(() => IpNetwork.fromAddressUnsafe(ip("10.1.2.3"), 33))
    assert.throws(() => IpNetwork.fromStringUnsafe("10.1.2.3/8"))
  })

  it("decodes declarations and canonically encodes Schema strings", () => {
    const ipv6 = Schema.decodeUnknownSync(Schema.Ipv6NetworkFromString)(
      "2001:0DB8:0000:0000:0000:0000:0000:0000/32"
    )
    assert.strictEqual(Schema.encodeSync(Schema.Ipv6NetworkFromString)(ipv6), "2001:db8::/32")
    assert.strictEqual(
      IpNetwork.format(Schema.decodeUnknownSync(Schema.IpNetworkFromString)("192.0.2.0/24")),
      "192.0.2.0/24"
    )
    assert.throws(() => Schema.decodeUnknownSync(Schema.IpNetworkFromString)("192.0.2.1/24"))
    assert.throws(() =>
      Schema.decodeUnknownSync(Schema.IpNetwork)({ _tag: "Ipv4Network", address: ip("192.0.2.0"), prefixLength: 24 })
    )
  })

  it("round trips generated canonical networks", () => {
    fc.assert(fc.property(
      fc.tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 32 })
      ),
      ([a, b, c, d, prefix]) => {
        const address = success(Net.ipv4FromOctets(a, b, c, d))
        const value = success(IpNetwork.fromAddress(address, prefix))
        const parsed = success(IpNetwork.fromString(IpNetwork.format(value)))
        assert.isTrue(Equal.equals(parsed, value))
        assert.isTrue(IpNetwork.contains(value, address))
      }
    ))

    fc.assert(fc.property(
      fc.tuple(
        fc.array(fc.integer({ min: 0, max: 0xffff }), { minLength: 8, maxLength: 8 }),
        fc.integer({ min: 0, max: 128 })
      ),
      ([segments, prefix]) => {
        const address = success(
          Net.ipv6FromSegments(...segments as [number, number, number, number, number, number, number, number])
        )
        const value = success(IpNetwork.fromAddress(address, prefix))
        assert.isTrue(Equal.equals(success(IpNetwork.fromString(IpNetwork.format(value))), value))
        assert.isTrue(IpNetwork.contains(value, address))
      }
    ))
  })
})
