import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash, Result, Schema } from "effect"
import * as IpInterface from "effect/unstable/net/IpInterface"
import * as IpNetwork from "effect/unstable/net/IpNetwork"
import * as NetAddress from "effect/unstable/net/NetAddress"
import { inspect } from "node:util"

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
  it("serializes and inspects canonical address and prefix strings", () => {
    for (const input of ["192.0.2.1/24", "2001:db8::1/64"]) {
      const value = IpInterface.fromStringUnsafe(input)
      assert.strictEqual(value.toJSON(), input)
      assert.strictEqual(JSON.stringify(value), JSON.stringify(input))
      assert.strictEqual(inspect(value), input)
    }
  })

  it("retains the original input for invalid addresses and prefixes", () => {
    for (const input of ["localhost/24", "1.2.3.4/+24", "1.2.3.4/33", "::ffff:192.00.2.1/128", "2001:db8::/129"]) {
      assert.strictEqual(failure(IpInterface.fromString(input)).input, input)
    }
    assert.strictEqual(failure(IpInterface.ipv4FromString("localhost/24")).input, "localhost/24")
    assert.strictEqual(failure(IpInterface.ipv6FromString("2001:db8::/129")).input, "2001:db8::/129")
  })

  it("constructs one generic runtime representation", () => {
    const ipv4 = IpInterface.makeUnsafe(NetAddress.ipv4Unspecified, 0)
    const ipv6 = IpInterface.makeUnsafe(NetAddress.ipv6Unspecified, 0)
    assert.isTrue(Object.isFrozen(ipv4))
    assert.isTrue(Object.isFrozen(ipv6))
    assert.strictEqual(ipv4._tag, "IpInterface")
    assert.strictEqual(ipv6._tag, "IpInterface")
    assert.isTrue(IpInterface.isIpv4Interface(ipv4))
    assert.isTrue(IpInterface.isIpv6Interface(ipv6))
    assert.isTrue(IpInterface.isIpInterface(ipv4))
  })

  it("defaults bare addresses to full-width prefixes", () => {
    assert.strictEqual(IpInterface.format(interfaceAddress("192.0.2.1")), "192.0.2.1/32")
    assert.strictEqual(IpInterface.format(interfaceAddress("2001:db8::1")), "2001:db8::1/128")
  })

  it("parses prefixes and preserves host bits", () => {
    assert.strictEqual(IpInterface.format(interfaceAddress("192.0.2.1/24")), "192.0.2.1/24")
    assert.strictEqual(
      IpInterface.format(interfaceAddress("2001:0DB8:0000:0000:0000:0000:0000:0001/64")),
      "2001:db8::1/64"
    )
  })

  it("rejects invalid prefixes and malformed input", () => {
    const address = ip("10.1.2.3")
    for (const prefix of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 33]) {
      failure(IpInterface.make(address, prefix))
    }
    assert.strictEqual(failure(IpInterface.make(address, -1))._tag, "NetAddressError")
    assert.strictEqual(
      failure(IpInterface.fromString("1.2.3.4/+24")).message,
      "prefix length must be an unpadded ASCII decimal integer"
    )
    failure(IpInterface.fromString("1.2.3.4", { prefix: "required" }))
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
    assert.strictEqual(IpNetwork.format(IpNetwork.fromInterface(interfaceAddress("10.1.2.3/8"))), "10.0.0.0/8")
  })

  it("provides throwing counterparts", () => {
    assert.strictEqual(IpInterface.format(IpInterface.fromStringUnsafe("10.1.2.3/8")), "10.1.2.3/8")
    assert.throws(() => IpInterface.makeUnsafe(ip("10.1.2.3"), 33))
  })

  it("decodes and canonically encodes schemas", () => {
    const value = Schema.decodeUnknownSync(Schema.IpInterfaceFromString)("192.0.2.1/24")
    assert.strictEqual(Schema.encodeSync(Schema.IpInterfaceFromString)(value), "192.0.2.1/24")
  })
})
