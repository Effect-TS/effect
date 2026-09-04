import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash, Result, Schema } from "effect"
import * as IpInterface from "effect/unstable/net/IpInterface"
import * as IpNetwork from "effect/unstable/net/IpNetwork"
import * as NetAddress from "effect/unstable/net/NetAddress"

const success = <A>(result: Result.Result<A, unknown>): A => {
  if (Result.isFailure(result)) assert.fail("expected Success")
  return result.success
}

const failure = <E>(result: Result.Result<unknown, E>): E => {
  if (Result.isSuccess(result)) assert.fail("expected Failure")
  return result.failure
}

const ip = (input: string): NetAddress.IpAddress => success(NetAddress.ipFromString(input))
const interfaceAddress = (input: string): IpInterface.IpInterface => success(IpInterface.fromString(input))

describe("IpInterface", () => {
  it("constructs immutable family-specific values while preserving host bits", () => {
    const ipv4 = IpInterface.makeUnsafe(ip("10.1.2.3"), 8)
    const ipv6 = IpInterface.makeUnsafe(ip("2001:db8::1"), 32)
    assert.isTrue(Object.isFrozen(ipv4))
    assert.isTrue(Object.isFrozen(ipv6))
    assert.isTrue(IpInterface.isIpv4Interface(ipv4))
    assert.isTrue(IpInterface.isIpv6Interface(ipv6))
    assert.isTrue(IpInterface.isIpInterface(ipv4))
    assert.strictEqual(ipv4.toString(), "10.1.2.3/8")
    assert.strictEqual(ipv6.toString(), "2001:db8::1/32")
  })

  it("defaults bare addresses to full-width prefixes", () => {
    assert.strictEqual(IpInterface.format(interfaceAddress("192.0.2.1")), "192.0.2.1/32")
    assert.strictEqual(IpInterface.format(interfaceAddress("2001:db8::1")), "2001:db8::1/128")
  })

  it("parses prefixes and formats canonical address text", () => {
    assert.strictEqual(IpInterface.format(interfaceAddress("192.0.2.1/24")), "192.0.2.1/24")
    assert.strictEqual(
      IpInterface.format(interfaceAddress("2001:0DB8:0000:0000:0000:0000:0000:0001/64")),
      "2001:db8::1/64"
    )
  })

  it("rejects invalid prefix lengths and malformed input", () => {
    const address = ip("10.1.2.3")
    for (const prefix of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 33]) {
      failure(IpInterface.make(address, prefix))
    }
    const error = failure(IpInterface.make(address, -1))
    assert.strictEqual(error._tag, "IpInterfaceError")
    assert.strictEqual(error.kind, "PrefixLength")
    assert.strictEqual(error.input, -1)
    assert.strictEqual(error.message, "PrefixLength: prefix length must be an integer from 0 through 32")

    for (
      const input of [
        "",
        "/24",
        "1.2.3.4/",
        "1.2.3.4/24/1",
        "1.2.3.4/+24",
        "1.2.3.4/024",
        "1.2.3.4/24 ",
        "1.2.3.4/33",
        "2001:db8::1/129"
      ]
    ) {
      failure(IpInterface.fromString(input))
    }
    failure(IpInterface.ipv4FromString("::1/128"))
    failure(IpInterface.ipv6FromString("127.0.0.1/32"))
  })

  it("uses address and prefix equality with matching hashes", () => {
    const first = interfaceAddress("2001:0DB8:0:0:0:0:0:1/64")
    const second = interfaceAddress("2001:db8::1/64")
    assert.isTrue(Equal.equals(first, second))
    assert.strictEqual(Hash.hash(first), Hash.hash(second))
    assert.isFalse(Equal.equals(first, interfaceAddress("2001:db8::1/65")))
  })

  it("converts to the canonical containing network", () => {
    assert.strictEqual(IpNetwork.format(IpInterface.network(interfaceAddress("10.1.2.3/8"))), "10.0.0.0/8")
    assert.strictEqual(
      IpNetwork.format(IpInterface.network(interfaceAddress("2001:db8:0:1:ffff::1/63"))),
      "2001:db8::/63"
    )
  })

  it("provides checked unsafe wrappers", () => {
    assert.strictEqual(IpInterface.format(IpInterface.fromStringUnsafe("10.1.2.3/8")), "10.1.2.3/8")
    assert.throws(() => IpInterface.makeUnsafe(ip("10.1.2.3"), 33))
    assert.throws(() => IpInterface.fromStringUnsafe("10.1.2.3/33"))
  })

  it("decodes declarations and canonically encodes Schema strings", () => {
    const ipv6 = Schema.decodeUnknownSync(Schema.Ipv6InterfaceFromString)(
      "2001:0DB8:0000:0000:0000:0000:0000:0001/64"
    )
    assert.strictEqual(Schema.encodeSync(Schema.Ipv6InterfaceFromString)(ipv6), "2001:db8::1/64")
    assert.strictEqual(
      IpInterface.format(Schema.decodeUnknownSync(Schema.IpInterfaceFromString)("192.0.2.1")),
      "192.0.2.1/32"
    )
    assert.throws(() =>
      Schema.decodeUnknownSync(Schema.IpInterface)({
        _tag: "Ipv4Interface",
        address: ip("192.0.2.1"),
        prefixLength: 24
      })
    )
  })
})
