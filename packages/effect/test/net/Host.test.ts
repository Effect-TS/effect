import { assert, describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import { Equal, Hash, Result, Schema } from "effect"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"

const success = <A>(result: Result.Result<A, unknown>): A => {
  assertTrue(Result.isSuccess(result), "expected Success")
  return result.success
}

const failure = <E>(result: Result.Result<unknown, E>): E => {
  assertTrue(Result.isFailure(result), "expected Failure")
  return result.failure
}

describe("Host", () => {
  describe("domain names", () => {
    it("normalizes case and keeps a trailing dot", () => {
      assert.strictEqual(success(Host.domainNameFromString("Example.COM")), "example.com")
      assert.strictEqual(success(Host.domainNameFromString("example.com.")), "example.com.")
      assert.strictEqual(success(Host.domainNameFromString(".")), ".")
      assert.isTrue(Host.isFullyQualified(success(Host.domainNameFromString("example.com."))))
      assert.isFalse(Host.isFullyQualified(success(Host.domainNameFromString("example.com"))))
    })

    it("allows underscores for service names", () => {
      assert.strictEqual(success(Host.domainNameFromString("_pg._tcp.DB.internal")), "_pg._tcp.db.internal")
    })

    it("converts internationalized names to ASCII", () => {
      assert.strictEqual(success(Host.domainNameFromString("Bücher.Example")), "xn--bcher-kva.example")
      assert.strictEqual(success(Host.domainNameFromString("faß.de")), "xn--fa-hia.de")
      assert.strictEqual(success(Host.domainNameFromString("ＥＸＡＭＰＬＥ.com")), "example.com")
    })

    it("rejects malformed names", () => {
      for (
        const input of [
          "",
          "..",
          "a..b",
          "-bad.com",
          "bad-.com",
          "a b.com",
          "ex%41mple.com",
          "a/b.com",
          "user@example.com",
          "1.2.3.4",
          "foo.123",
          "foo.0x1f",
          "１.２.３.４",
          `${"a".repeat(64)}.com`,
          `${"a.".repeat(127)}com`
        ]
      ) {
        failure(Host.domainNameFromString(input))
      }
    })

    it("guards normalized names only", () => {
      assert.isTrue(Host.isDomainName("example.com"))
      assert.isFalse(Host.isDomainName("Example.com"))
      assert.isFalse(Host.isDomainName("bücher.example"))
      assert.isFalse(Host.isDomainName(1))
    })
  })

  describe("hosts", () => {
    it("parses numeric addresses before names", () => {
      assert.isTrue(NetAddress.isIpv4Address(success(Host.hostFromString("10.0.0.5"))))
      assert.isTrue(NetAddress.isIpv6Address(success(Host.hostFromString("2001:DB8::1"))))
      assert.strictEqual<unknown>(success(Host.hostFromString("DB.internal")), "db.internal")
    })

    it("keeps IPv6 zones as scoped literals", () => {
      assert.strictEqual<unknown>(success(Host.hostFromString("FE80:0::1%eth0")), "fe80::1%eth0")
      assert.strictEqual<unknown>(success(Host.hostFromString("fe80::1%3")), "fe80::1%3")
      assert.isTrue(NetAddress.isScopedIpv6Literal("fe80::1%eth0"))
      assert.isFalse(NetAddress.isScopedIpv6Literal("FE80::1%eth0"))
      failure(Host.hostFromString("fe80::1%"))
      failure(Host.hostFromString("10.0.0.1%eth0"))
      failure(Host.hostFromString("fe80::zz"))
    })

    it("formats hosts", () => {
      assert.strictEqual(Host.formatHost(success(Host.hostFromString("2001:db8::1"))), "2001:db8::1")
      assert.strictEqual(Host.formatHost(success(Host.hostFromString("Example.com"))), "example.com")
    })
  })

  describe("host and port", () => {
    it("parses and formats endpoints", () => {
      for (
        const [input, expected] of [
          ["DB.internal:5432", "db.internal:5432"],
          ["10.0.0.5:80", "10.0.0.5:80"],
          ["[2001:DB8::1]:443", "[2001:db8::1]:443"],
          ["[fe80::1%eth0]:80", "[fe80::1%eth0]:80"],
          ["localhost:0", "localhost:0"]
        ] as const
      ) {
        assert.strictEqual(Host.formatHostPort(success(Host.hostPortFromString(input))), expected)
      }
    })

    it("rejects malformed endpoints", () => {
      for (
        const input of [
          "example.com",
          "example.com:",
          "example.com:080",
          "example.com:65536",
          "example.com:-1",
          "::1:80",
          "[::1]80",
          "[10.0.0.1]:80",
          "[example.com]:80",
          "bad name:80"
        ]
      ) {
        failure(Host.hostPortFromString(input))
      }
    })

    it("checks constructed endpoints", () => {
      const host = success(Host.hostFromString("example.com"))
      assert.strictEqual(Host.formatHostPort(success(Host.hostPort(host, 443))), "example.com:443")
      failure(Host.hostPort(host, 70000))
      failure(Host.hostPort(host, 1.5))
      failure(Host.hostPort("Not Valid" as Host.Host, 80))
    })

    it("implements equality and hashing", () => {
      const a = success(Host.hostPortFromString("example.com:80"))
      const b = success(Host.hostPortFromString("EXAMPLE.com:80"))
      const c = success(Host.hostPortFromString("[::1]:80"))
      const d = success(Host.hostPortFromString("[0:0::1]:80"))
      assert.isTrue(Equal.equals(a, b))
      assert.strictEqual(Hash.hash(a), Hash.hash(b))
      assert.isTrue(Equal.equals(c, d))
      assert.strictEqual(Hash.hash(c), Hash.hash(d))
      assert.isFalse(Equal.equals(a, success(Host.hostPortFromString("example.com:81"))))
      assert.strictEqual(String(a), "example.com:80")
      assert.strictEqual(JSON.stringify(c), "\"[::1]:80\"")
    })
  })

  it("converts numeric hosts to internet addresses", () => {
    const format = (input: string, scopeIds?: ReadonlyMap<string, number>) =>
      NetAddress.formatInet(success(Host.toInetAddress(success(Host.hostPortFromString(input)), scopeIds)))
    assert.strictEqual(format("10.0.0.5:80"), "10.0.0.5:80")
    assert.strictEqual(format("[::1]:443"), "[::1]:443")
    assert.strictEqual(format("[fe80::1%7]:80"), "[fe80::1%7]:80")
    assert.strictEqual(format("[fe80::1%eth0]:80", new Map([["eth0", 2]])), "[fe80::1%2]:80")
    failure(Host.toInetAddress(success(Host.hostPortFromString("[fe80::1%eth0]:80"))))
    failure(Host.toInetAddress(success(Host.hostPortFromString("example.com:80"))))
  })

  it("decodes and encodes schemas", () => {
    assert.strictEqual(Schema.decodeUnknownSync(Schema.DomainNameFromString)("Example.COM"), "example.com")
    assert.throws(() => Schema.decodeUnknownSync(Schema.DomainNameFromString)("bad name"))
    assert.isTrue(Schema.is(Schema.DomainName)("example.com"))
    assert.isFalse(Schema.is(Schema.DomainName)("Example.com"))

    const host = Schema.decodeUnknownSync(Schema.HostFromString)("2001:DB8::1")
    assert.isTrue(NetAddress.isIpv6Address(host))
    assert.strictEqual(Schema.encodeSync(Schema.HostFromString)(host), "2001:db8::1")

    const endpoint = Schema.decodeUnknownSync(Schema.HostPortFromString)("DB.internal:5432")
    assert.strictEqual<unknown>(endpoint.host, "db.internal")
    assert.strictEqual(endpoint.port, 5432)
    assert.strictEqual(Schema.encodeSync(Schema.HostPortFromString)(endpoint), "db.internal:5432")
    assert.throws(() => Schema.decodeUnknownSync(Schema.HostPortFromString)("db.internal"))
  })

  it("round-trips schemas through JSON", () => {
    const schema = Schema.Struct({ host: Schema.Host, endpoint: Schema.HostPort, name: Schema.DomainName })
    const codec = Schema.toCodecJson(schema)
    const value = {
      host: success(Host.hostFromString("10.0.0.5")),
      endpoint: success(Host.hostPortFromString("[fe80::1%eth0]:80")),
      name: success(Host.domainNameFromString("example.com"))
    }
    const json = Schema.encodeSync(codec)(value)
    assert.deepStrictEqual(json, { host: "10.0.0.5", endpoint: "[fe80::1%eth0]:80", name: "example.com" })
    const decoded = Schema.decodeUnknownSync(codec)(json)
    assert.isTrue(Equal.equals(decoded.host, value.host))
    assert.isTrue(Equal.equals(decoded.endpoint, value.endpoint))
    assert.strictEqual(decoded.name, value.name)
  })
})
