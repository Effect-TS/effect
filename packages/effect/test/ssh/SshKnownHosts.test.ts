import { assert, describe } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as PlatformError from "effect/PlatformError"
import * as Result from "effect/Result"
import type { HostKeyInfo } from "effect/ssh/SshClient"
import type * as SshError from "effect/ssh/SshError"
import * as SshKey from "effect/ssh/SshKey"
import * as SshKnownHosts from "effect/ssh/SshKnownHosts"
import { it } from "./utils/crypto.ts"

// Public keys of the fixtures in ./fixtures/keys
const ed25519Text = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOpbD3y/yIaPewNbIgtE7MgXJjuZWGYI+O8Ewf2VmOb1"
const otherEd25519Text = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIC8sFJHLotJ6taUQekCA5wAC++4Y9IwvCEmfNI6JTzyW"
const ecdsaText =
  "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBJrG5xuR8X9JihXQc3bA1WAQjaj0vIzFJDlsGwfZ5mOqmXVUW8Os3rrG4xoEc0/jlDGtySnZ0sJOCwbt57cEEEI="
const rsaText =
  "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD3XC3cH1qmLiY9Vu485vdQCf3nggNQucVXPFk7ui4zWAmLsxBz4VAmbcuRsQYZ/ykhstaCr3nz5aM0ApweGAZ5cZP7dT/ScrMNLiG8ThFxvEYmZR/rKv+zghZaJyL3Dq2tBL+Ycci26B40PblXj4WXgCijGtY7M7pVSBjP0ANiwGhdwv72tqvRcNDQGaN323ZG+KiwcntUCemR6cMDOu5KH0SBsxvxyrEAh2/Eh11bhz6y5JO/E2YTlQjga/AdGvUWe1ZfkavUeQMIF91vg4ipzf8Vnpgk9xSX7tpmGrXTAkerSzZjnUBPRdD+3vrHhhkfZuFPYv08Iz6u1VVyzm3j"

// Generated with OpenSSH_10.5p1 from a file containing
//   example.com <ed25519Text>
//   [example.org]:2222 <ecdsaText>
// by running `ssh-keygen -H -f known_hosts`.
const hashedExampleCom =
  "|1|ygiiQPt+/3eEZQNb/lYU/xpyvYI=|wqwLO82uKjrwqnit/WicN5HuNTI= ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOpbD3y/yIaPewNbIgtE7MgXJjuZWGYI+O8Ewf2VmOb1"
const hashedExampleOrg2222 =
  "|1|8UaBTism41bfq+piRfLbKIpXuRE=|xdKGtsFy6fhRdHXwzjfkXuGZcvY= ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBJrG5xuR8X9JihXQc3bA1WAQjaj0vIzFJDlsGwfZ5mOqmXVUW8Os3rrG4xoEc0/jlDGtySnZ0sJOCwbt57cEEEI="

const parseKey = (text: string): SshKey.PublicKey => {
  const result = SshKey.parsePublicKey(text)
  if (Result.isFailure(result)) throw result.failure
  return result.success
}

const ed25519 = parseKey(ed25519Text)
const otherEd25519 = parseKey(otherEd25519Text)
const ecdsa = parseKey(ecdsaText)
const rsa = parseKey(rsaText)

const info = (host: string, port: number, key: SshKey.PublicKey): HostKeyInfo => ({
  host,
  port,
  key,
  fingerprint: `SHA256:fingerprint-of-${key.type}`
})

const assertHostKeyError = (
  error: SshError.SshError,
  kind: "Unknown" | "Mismatch" | "Revoked",
  host: string,
  keyType: string
) => {
  assert.strictEqual(error._tag, "SshError")
  const reason = error.reason
  assert.strictEqual(reason._tag, "SshHostKeyError")
  if (reason._tag === "SshHostKeyError") {
    assert.strictEqual(reason.kind, kind)
    assert.strictEqual(reason.host, host)
    assert.strictEqual(reason.keyType, keyType)
    assert.strictEqual(reason.fingerprint, `SHA256:fingerprint-of-${keyType}`)
  }
}

const notFound = (method: string, path: string) =>
  PlatformError.systemError({ _tag: "NotFound", module: "FileSystem", method, pathOrDescriptor: path })

/** An in-memory FileSystem backed by a Map of path -> contents. */
const makeFileSystem = (files: Map<string, string>, options?: { readonly failWrites?: boolean }) =>
  FileSystem.makeNoop({
    exists: (path) => Effect.succeed(files.has(path)),
    access: (path) => files.has(path) ? Effect.void : Effect.fail(notFound("access", path)),
    readFileString: (path) => {
      const content = files.get(path)
      return content === undefined ? Effect.fail(notFound("readFileString", path)) : Effect.succeed(content)
    },
    writeFileString: (path, data, writeOptions) => {
      if (options?.failWrites === true) {
        return Effect.fail(
          PlatformError.systemError({
            _tag: "PermissionDenied",
            module: "FileSystem",
            method: "writeFileString",
            pathOrDescriptor: path
          })
        )
      }
      return Effect.sync(() => {
        const append = writeOptions?.flag === "a"
        files.set(path, append ? (files.get(path) ?? "") + data : data)
      })
    },
    writeFile: (path, data, writeOptions) =>
      Effect.sync(() => {
        const text = new TextDecoder().decode(data)
        files.set(path, writeOptions?.flag === "a" ? (files.get(path) ?? "") + text : text)
      })
  })

describe("SshKnownHosts", () => {
  describe("parse", () => {
    it("skips comments, blank lines, and invalid lines and records line numbers", () => {
      const knownHosts = SshKnownHosts.parse([
        "# a comment",
        "",
        `example.com ${ed25519Text}`,
        "   ",
        `  indented.example.com,10.0.0.1   ${ecdsaText} a comment here  `,
        "   # an indented comment",
        `@revoked revoked.example.com ${otherEd25519Text}`,
        `@cert-authority *.example.com ${rsaText}`,
        `@unknown-marker host.example.com ${ed25519Text}`,
        "host-only",
        "host ssh-ed25519",
        "host ssh-ed25519 !!!not-base64!!!",
        `host ssh-rsa ${ed25519Text.split(" ")[1]}`,
        "@revoked",
        `@revoked ${ed25519Text}`,
        `[example.org]:2222\t${rsaText}`
      ].join("\n"))
      assert.deepStrictEqual(
        knownHosts.entries.map((entry) => ({
          marker: entry.marker,
          hosts: entry.hosts,
          type: entry.key.type,
          line: entry.line
        })),
        [
          { marker: undefined, hosts: "example.com", type: "ssh-ed25519", line: 3 },
          { marker: undefined, hosts: "indented.example.com,10.0.0.1", type: "ecdsa-sha2-nistp256", line: 5 },
          { marker: "revoked", hosts: "revoked.example.com", type: "ssh-ed25519", line: 7 },
          { marker: "cert-authority", hosts: "*.example.com", type: "ssh-rsa", line: 8 },
          { marker: undefined, hosts: "[example.org]:2222", type: "ssh-rsa", line: 16 }
        ]
      )
      assert.isTrue(SshKey.equals(knownHosts.entries[0].key, ed25519))
      assert.isTrue(SshKey.equals(knownHosts.entries[1].key, ecdsa))
      assert.strictEqual(knownHosts.entries[1].key.comment, "a comment here")
      assert.isTrue(SshKey.equals(knownHosts.entries[2].key, otherEd25519))
    })

    it("handles CRLF line endings and empty input", () => {
      const knownHosts = SshKnownHosts.parse(`# comment\r\nexample.com ${ed25519Text}\r\nexample.org ${ecdsaText}\r\n`)
      assert.deepStrictEqual(knownHosts.entries.map((entry) => [entry.hosts, entry.line]), [
        ["example.com", 2],
        ["example.org", 3]
      ])
      assert.deepStrictEqual(SshKnownHosts.parse("").entries, [])
      assert.deepStrictEqual(SshKnownHosts.parse("\n\n# only comments\n").entries, [])
    })

    it("parses hashed entries", () => {
      const knownHosts = SshKnownHosts.parse(`${hashedExampleCom}\n${hashedExampleOrg2222}\n`)
      assert.strictEqual(knownHosts.entries.length, 2)
      assert.strictEqual(knownHosts.entries[0].hosts, hashedExampleCom.split(" ")[0])
      assert.isTrue(SshKey.equals(knownHosts.entries[0].key, ed25519))
      assert.isTrue(SshKey.equals(knownHosts.entries[1].key, ecdsa))
    })
  })

  it("hostName", () => {
    assert.strictEqual(SshKnownHosts.hostName("example.com", 22), "example.com")
    assert.strictEqual(SshKnownHosts.hostName("example.com", 2222), "[example.com]:2222")
    assert.strictEqual(SshKnownHosts.hostName("10.0.0.1", 80), "[10.0.0.1]:80")
    assert.strictEqual(SshKnownHosts.hostName("::1", 2200), "[::1]:2200")
  })

  describe("check", () => {
    it.effect("returns Match, Mismatch, Unknown, and Revoked", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse([
          `example.com ${ed25519Text}`,
          `example.com ${ecdsaText}`,
          `revoked.example.com ${ed25519Text}`,
          `@revoked revoked.example.com ${ed25519Text}`
        ].join("\n"))
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, ed25519), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, ecdsa), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, otherEd25519), "Mismatch")
        // a key type that is not recorded for the host is unknown, not a mismatch
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, rsa), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "other.example.com", 22, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "revoked.example.com", 22, ed25519), "Revoked")
        assert.strictEqual(yield* SshKnownHosts.check({ entries: [] }, "example.com", 22, ed25519), "Unknown")
      }))

    it.effect("a matching key wins over mismatching entries regardless of order", () =>
      Effect.gen(function*() {
        const before = SshKnownHosts.parse(`example.com ${otherEd25519Text}\nexample.com ${ed25519Text}`)
        const after = SshKnownHosts.parse(`example.com ${ed25519Text}\nexample.com ${otherEd25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(before, "example.com", 22, ed25519), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(after, "example.com", 22, ed25519), "Match")
      }))

    it.effect("@revoked applies to any matching host and takes precedence", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse(`example.com ${ed25519Text}\n@revoked * ${ed25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, ed25519), "Revoked")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "anything", 2222, ed25519), "Revoked")
        // a revoked entry for another key does not affect this one
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "anything", 22, otherEd25519), "Unknown")
        // a revoked entry for a non-matching host does not apply
        const scoped = SshKnownHosts.parse(`example.com ${ed25519Text}\n@revoked other.com ${ed25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(scoped, "example.com", 22, ed25519), "Match")
      }))

    it.effect("@cert-authority entries are ignored", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse(`@cert-authority example.com ${ed25519Text}`)
        assert.strictEqual(knownHosts.entries.length, 1)
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, otherEd25519), "Unknown")
      }))

    it.effect("uses [host]:port for non-standard ports", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse(`[example.org]:2222 ${ed25519Text}\nexample.com ${ed25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.org", 2222, ed25519), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.org", 22, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.org", 2223, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 2222, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, ed25519), "Match")
      }))

    it.effect("supports comma-separated patterns", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse(`example.com,10.0.0.1,[example.com]:2222 ${ed25519Text}`)
        for (const [host, port] of [["example.com", 22], ["10.0.0.1", 22], ["example.com", 2222]] as const) {
          assert.strictEqual(yield* SshKnownHosts.check(knownHosts, host, port, ed25519), "Match", `${host}:${port}`)
        }
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "10.0.0.2", 22, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "10.0.0.1", 2222, ed25519), "Unknown")
      }))

    it.effect("supports * and ? wildcards", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse(
          `*.example.com ${ed25519Text}\nhost?.example.org ${ed25519Text}\n[*.example.net]:2222 ${ed25519Text}`
        )
        const status = (host: string, port = 22) => SshKnownHosts.check(knownHosts, host, port, ed25519)
        assert.strictEqual(yield* status("a.example.com"), "Match")
        assert.strictEqual(yield* status("a.b.example.com"), "Match")
        assert.strictEqual(yield* status("example.com"), "Unknown")
        assert.strictEqual(yield* status("a.example.com.evil"), "Unknown")
        assert.strictEqual(yield* status("host1.example.org"), "Match")
        assert.strictEqual(yield* status("hostX.example.org"), "Match")
        assert.strictEqual(yield* status("host.example.org"), "Unknown")
        assert.strictEqual(yield* status("host12.example.org"), "Unknown")
        assert.strictEqual(yield* status("a.example.net", 2222), "Match")
        assert.strictEqual(yield* status("a.example.net"), "Unknown")
        // dots are literal
        assert.strictEqual(yield* status("host1Xexample.org"), "Unknown")
        assert.strictEqual(yield* status("aXexampleXcom"), "Unknown")
      }))

    it.effect("supports negated patterns", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse(`*.example.com,!bad.example.com ${ed25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "good.example.com", 22, ed25519), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "bad.example.com", 22, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "bad.example.com", 22, otherEd25519), "Unknown")
        // the negation also applies when it is listed first
        const first = SshKnownHosts.parse(`!bad.example.com,*.example.com ${ed25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(first, "bad.example.com", 22, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(first, "good.example.com", 22, ed25519), "Match")
        // a list with only negated patterns matches nothing
        const negatedOnly = SshKnownHosts.parse(`!bad.example.com ${ed25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(negatedOnly, "good.example.com", 22, ed25519), "Unknown")
        // wildcard negations
        const wildcard = SshKnownHosts.parse(`*,!*.internal ${ed25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(wildcard, "db.internal", 22, ed25519), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(wildcard, "example.com", 22, ed25519), "Match")
      }))

    it.effect("matches plain patterns case-insensitively", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse(`Example.COM,*.Example.Org ${ed25519Text}`)
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, ed25519), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "EXAMPLE.com", 22, ed25519), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "WWW.example.ORG", 22, ed25519), "Match")
      }))

    it.effect("matches hashed entries produced by ssh-keygen -H", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse(`${hashedExampleCom}\n${hashedExampleOrg2222}`)
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, ed25519), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, otherEd25519), "Mismatch")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.org", 2222, ecdsa), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.org", 22, ecdsa), "Unknown")
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.net", 22, ed25519), "Unknown")
        assert.isTrue(yield* SshKnownHosts.matches(knownHosts.entries[0], "example.com", 22))
        assert.isFalse(yield* SshKnownHosts.matches(knownHosts.entries[0], "example.com", 2222))
        assert.isTrue(yield* SshKnownHosts.matches(knownHosts.entries[1], "example.org", 2222))
        // OpenSSH lower-cases host names before hashing them.
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "EXAMPLE.com", 22, ed25519), "Match")
      }))

    it.effect("ignores malformed hashed entries", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse([
          `|1|onlysalt ${ed25519Text}`,
          `|1|!!!|!!! ${ed25519Text}`,
          `|1| ${ed25519Text}`
        ].join("\n"))
        assert.strictEqual(knownHosts.entries.length, 3)
        assert.strictEqual(yield* SshKnownHosts.check(knownHosts, "example.com", 22, ed25519), "Unknown")
      }))
  })

  describe("matches", () => {
    it.effect("tests a single entry", () =>
      Effect.gen(function*() {
        const [entry] = SshKnownHosts.parse(`*.example.com,!bad.example.com ${ed25519Text}`).entries
        assert.isTrue(yield* SshKnownHosts.matches(entry, "a.example.com", 22))
        assert.isFalse(yield* SshKnownHosts.matches(entry, "bad.example.com", 22))
        assert.isFalse(yield* SshKnownHosts.matches(entry, "a.example.com", 2222))
      }))
  })

  describe("formatEntry", () => {
    it.effect("formats plain entries", () =>
      Effect.gen(function*() {
        const commented = parseKey(`${ed25519Text} user@host`)
        assert.strictEqual(yield* SshKnownHosts.formatEntry("example.com", 22, commented), `example.com ${ed25519Text}`)
        assert.strictEqual(
          yield* SshKnownHosts.formatEntry("example.com", 2222, ecdsa, { hash: false }),
          `[example.com]:2222 ${ecdsaText}`
        )
      }))

    it.effect("plain entries round trip through parse and check", () =>
      Effect.gen(function*() {
        for (const [host, port, key] of [["example.com", 22, ed25519], ["10.1.2.3", 2222, rsa]] as const) {
          const line = yield* SshKnownHosts.formatEntry(host, port, key)
          const knownHosts = SshKnownHosts.parse(line)
          assert.strictEqual(knownHosts.entries.length, 1)
          assert.isTrue(SshKey.equals(knownHosts.entries[0].key, key))
          assert.strictEqual(yield* SshKnownHosts.check(knownHosts, host, port, key), "Match")
        }
      }))

    it.effect("formats hashed entries that round trip through check", () =>
      Effect.gen(function*() {
        for (const [host, port, key] of [["example.com", 22, ed25519], ["example.org", 2222, ecdsa]] as const) {
          const line = yield* SshKnownHosts.formatEntry(host, port, key, { hash: true })
          assert.match(line, /^\|1\|[A-Za-z0-9+/]{27}=\|[A-Za-z0-9+/]{27}= /)
          assert.isFalse(line.includes(host))
          assert.isTrue(line.endsWith(` ${key.type} ${SshKey.formatPublicKey({ ...key, comment: "" }).split(" ")[1]}`))
          const knownHosts = SshKnownHosts.parse(line)
          assert.strictEqual(yield* SshKnownHosts.check(knownHosts, host, port, key), "Match")
          assert.strictEqual(yield* SshKnownHosts.check(knownHosts, host, port === 22 ? 2222 : 22, key), "Unknown")
          assert.strictEqual(yield* SshKnownHosts.check(knownHosts, `x${host}`, port, key), "Unknown")
        }
      }))

    it.effect("hashed entries use a fresh salt", () =>
      Effect.gen(function*() {
        const a = yield* SshKnownHosts.formatEntry("example.com", 22, ed25519, { hash: true })
        const b = yield* SshKnownHosts.formatEntry("example.com", 22, ed25519, { hash: true })
        assert.notStrictEqual(a, b)
        assert.strictEqual(a.split(" ").slice(1).join(" "), b.split(" ").slice(1).join(" "))
      }))
  })

  describe("keyTypes", () => {
    it.effect("lists recorded key types for a host in file order", () =>
      Effect.gen(function*() {
        const knownHosts = SshKnownHosts.parse([
          `example.com ${ecdsaText}`,
          `*.com ${ed25519Text}`,
          `example.com ${otherEd25519Text}`,
          `@revoked example.com ${rsaText}`,
          `@cert-authority example.com ${rsaText}`,
          `[example.com]:2222 ${rsaText}`,
          hashedExampleCom
        ].join("\n"))
        assert.deepStrictEqual(yield* SshKnownHosts.keyTypes(knownHosts, "example.com", 22), [
          "ecdsa-sha2-nistp256",
          "ssh-ed25519"
        ])
        assert.deepStrictEqual(yield* SshKnownHosts.keyTypes(knownHosts, "example.com", 2222), ["ssh-rsa"])
        assert.deepStrictEqual(yield* SshKnownHosts.keyTypes(knownHosts, "other.com", 22), ["ssh-ed25519"])
        assert.deepStrictEqual(yield* SshKnownHosts.keyTypes(knownHosts, "example.org", 22), [])
      }))
  })

  describe("verifier", () => {
    const knownHosts = SshKnownHosts.parse([
      `example.com ${ed25519Text}`,
      `[example.org]:2222 ${ecdsaText}`,
      `revoked.example.com ${ed25519Text}`,
      `@revoked revoked.example.com ${ed25519Text}`
    ].join("\n"))

    it.effect("accepts matching keys", () =>
      Effect.gen(function*() {
        const verify = SshKnownHosts.verifier(knownHosts)
        yield* verify(info("example.com", 22, ed25519))
        yield* verify(info("example.org", 2222, ecdsa))
      }))

    it.effect("rejects unknown keys", () =>
      Effect.gen(function*() {
        const verify = SshKnownHosts.verifier(knownHosts)
        assertHostKeyError(
          yield* Effect.flip(verify(info("unknown.example.com", 22, ed25519))),
          "Unknown",
          "unknown.example.com",
          "ssh-ed25519"
        )
        assertHostKeyError(
          yield* Effect.flip(verify(info("example.org", 22, ecdsa))),
          "Unknown",
          "example.org",
          "ecdsa-sha2-nistp256"
        )
        assertHostKeyError(
          yield* Effect.flip(verify(info("example.com", 2222, ed25519))),
          "Unknown",
          "[example.com]:2222",
          "ssh-ed25519"
        )
      }))

    it.effect("rejects mismatched keys", () =>
      Effect.gen(function*() {
        const verify = SshKnownHosts.verifier(knownHosts, { onUnknown: () => Effect.succeed(true) })
        const error = yield* Effect.flip(verify(info("example.com", 22, otherEd25519)))
        assertHostKeyError(error, "Mismatch", "example.com", "ssh-ed25519")
        assert.include(error.message, "does not match")
      }))

    it.effect("rejects revoked keys", () =>
      Effect.gen(function*() {
        const verify = SshKnownHosts.verifier(knownHosts, { onUnknown: () => Effect.succeed(true) })
        const error = yield* Effect.flip(verify(info("revoked.example.com", 22, ed25519)))
        assertHostKeyError(error, "Revoked", "revoked.example.com", "ssh-ed25519")
        assert.include(error.message, "revoked")
      }))

    it.effect("consults onUnknown for unknown keys only", () =>
      Effect.gen(function*() {
        const seen: Array<HostKeyInfo> = []
        const accepting = SshKnownHosts.verifier(knownHosts, {
          onUnknown: (info) => Effect.sync(() => seen.push(info)).pipe(Effect.as(true))
        })
        const unknown = info("new.example.com", 2200, rsa)
        yield* accepting(unknown)
        assert.deepStrictEqual(seen, [unknown])
        yield* accepting(info("example.com", 22, ed25519))
        assert.strictEqual(seen.length, 1)
        yield* Effect.flip(accepting(info("example.com", 22, otherEd25519)))
        assert.strictEqual(seen.length, 1)

        const rejecting = SshKnownHosts.verifier(knownHosts, { onUnknown: () => Effect.succeed(false) })
        assertHostKeyError(
          yield* Effect.flip(rejecting(unknown)),
          "Unknown",
          "[new.example.com]:2200",
          "ssh-rsa"
        )
      }))

    it.effect("propagates onUnknown failures", () =>
      Effect.gen(function*() {
        const verify = SshKnownHosts.verifier(knownHosts, {
          // a verifier that trusts nothing rejects every key as Unknown
          onUnknown: (info) => Effect.as(SshKnownHosts.verifier({ entries: [] })(info), true)
        })
        const error = yield* Effect.flip(verify(info("new.example.com", 22, ed25519)))
        assertHostKeyError(error, "Unknown", "new.example.com", "ssh-ed25519")
      }))

    it.effect("exposes keyTypes", () =>
      Effect.gen(function*() {
        const verify = SshKnownHosts.verifier(knownHosts)
        assert.isDefined(verify.keyTypes)
        assert.deepStrictEqual(yield* verify.keyTypes!("example.com", 22), ["ssh-ed25519"])
        assert.deepStrictEqual(yield* verify.keyTypes!("example.org", 2222), ["ecdsa-sha2-nistp256"])
        assert.deepStrictEqual(yield* verify.keyTypes!("example.org", 22), [])
      }))
  })

  describe("fromFile", () => {
    const path = "/home/user/.ssh/known_hosts"

    it.effect("reads the file", () =>
      Effect.gen(function*() {
        const files = new Map([[path, `# known hosts\nexample.com ${ed25519Text}\n${hashedExampleOrg2222}\n`]])
        const verify = yield* SshKnownHosts.fromFile(path).pipe(
          Effect.provideService(FileSystem.FileSystem, makeFileSystem(files))
        )
        yield* verify(info("example.com", 22, ed25519))
        yield* verify(info("example.org", 2222, ecdsa))
        assertHostKeyError(
          yield* Effect.flip(verify(info("example.com", 22, otherEd25519))),
          "Mismatch",
          "example.com",
          "ssh-ed25519"
        )
        assertHostKeyError(
          yield* Effect.flip(verify(info("unknown.example.com", 22, ed25519))),
          "Unknown",
          "unknown.example.com",
          "ssh-ed25519"
        )
        assert.deepStrictEqual(yield* verify.keyTypes!("example.com", 22), ["ssh-ed25519"])
        // nothing is written without acceptNew
        assert.strictEqual(files.get(path), `# known hosts\nexample.com ${ed25519Text}\n${hashedExampleOrg2222}\n`)
      }))

    it.effect("treats a missing file as empty", () =>
      Effect.gen(function*() {
        const files = new Map<string, string>()
        const verify = yield* SshKnownHosts.fromFile(path).pipe(
          Effect.provide(FileSystem.layerNoop({ exists: (p) => Effect.succeed(files.has(p)) }))
        )
        assertHostKeyError(
          yield* Effect.flip(verify(info("example.com", 22, ed25519))),
          "Unknown",
          "example.com",
          "ssh-ed25519"
        )
        assert.deepStrictEqual(yield* verify.keyTypes!("example.com", 22), [])
        assert.isFalse(files.has(path))
      }))

    it.effect("propagates read failures", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(
          SshKnownHosts.fromFile(path).pipe(
            Effect.provide(FileSystem.layerNoop({ exists: () => Effect.succeed(true) }))
          )
        )
        assert.strictEqual(error._tag, "PlatformError")
      }))

    it.effect("acceptNew appends unknown hosts to a missing file", () =>
      Effect.gen(function*() {
        const files = new Map<string, string>()
        const verify = yield* SshKnownHosts.fromFile(path, { acceptNew: true }).pipe(
          Effect.provideService(FileSystem.FileSystem, makeFileSystem(files))
        )
        yield* verify(info("example.com", 22, ed25519))
        assert.strictEqual(files.get(path), `example.com ${ed25519Text}\n`)
        yield* verify(info("example.org", 2222, ecdsa))
        assert.strictEqual(files.get(path), `example.com ${ed25519Text}\n[example.org]:2222 ${ecdsaText}\n`)

        // Hosts accepted once are remembered by the verifier.
        yield* verify(info("example.com", 22, ed25519))
        assert.strictEqual(files.get(path), `example.com ${ed25519Text}\n[example.org]:2222 ${ecdsaText}\n`)

        const reread = SshKnownHosts.parse(files.get(path)!)
        assert.strictEqual(yield* SshKnownHosts.check(reread, "example.com", 22, ed25519), "Match")
        assert.strictEqual(yield* SshKnownHosts.check(reread, "example.org", 2222, ecdsa), "Match")
      }))

    it.effect("acceptNew appends after existing content with a trailing newline", () =>
      Effect.gen(function*() {
        const original = `example.com ${ed25519Text}\n`
        const files = new Map([[path, original]])
        const verify = yield* SshKnownHosts.fromFile(path, { acceptNew: true }).pipe(
          Effect.provideService(FileSystem.FileSystem, makeFileSystem(files))
        )
        yield* verify(info("example.com", 22, ed25519))
        assert.strictEqual(files.get(path), original)
        yield* verify(info("new.example.com", 22, rsa))
        assert.strictEqual(files.get(path), `${original}new.example.com ${rsaText}\n`)
      }))

    it.effect("acceptNew inserts a newline when the file lacks a trailing newline", () =>
      Effect.gen(function*() {
        const original = `example.com ${ed25519Text}`
        const files = new Map([[path, original]])
        const verify = yield* SshKnownHosts.fromFile(path, { acceptNew: true }).pipe(
          Effect.provideService(FileSystem.FileSystem, makeFileSystem(files))
        )
        yield* verify(info("a.example.com", 22, ed25519))
        assert.strictEqual(files.get(path), `${original}\na.example.com ${ed25519Text}\n`)
        // the newline is only inserted once
        yield* verify(info("b.example.com", 22, ecdsa))
        assert.strictEqual(
          files.get(path),
          `${original}\na.example.com ${ed25519Text}\nb.example.com ${ecdsaText}\n`
        )
        const reread = SshKnownHosts.parse(files.get(path)!)
        assert.deepStrictEqual(reread.entries.map((entry) => entry.hosts), [
          "example.com",
          "a.example.com",
          "b.example.com"
        ])
      }))

    it.effect("acceptNew with hashHosts appends hashed entries", () =>
      Effect.gen(function*() {
        const files = new Map<string, string>()
        const verify = yield* SshKnownHosts.fromFile(path, { acceptNew: true, hashHosts: true }).pipe(
          Effect.provideService(FileSystem.FileSystem, makeFileSystem(files))
        )
        yield* verify(info("secret.example.com", 2222, ed25519))
        const content = files.get(path)!
        assert.match(content, /^\|1\|[^ ]+ ssh-ed25519 [^ ]+\n$/)
        assert.isFalse(content.includes("secret.example.com"))
        const reread = SshKnownHosts.parse(content)
        assert.strictEqual(yield* SshKnownHosts.check(reread, "secret.example.com", 2222, ed25519), "Match")
      }))

    it.effect("acceptNew never accepts mismatched or revoked keys", () =>
      Effect.gen(function*() {
        const original = `example.com ${ed25519Text}\n@revoked * ${otherEd25519Text}\n`
        const files = new Map([[path, original]])
        const verify = yield* SshKnownHosts.fromFile(path, { acceptNew: true }).pipe(
          Effect.provideService(FileSystem.FileSystem, makeFileSystem(files))
        )
        assertHostKeyError(
          yield* Effect.flip(verify(info("example.com", 22, otherEd25519))),
          "Revoked",
          "example.com",
          "ssh-ed25519"
        )
        const rotated = parseKey("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIATGhfVa+GVpBenTUsoCGmY5bOJP9i2lvTMeCOj0TBMU")
        assertHostKeyError(
          yield* Effect.flip(verify(info("example.com", 22, rotated))),
          "Mismatch",
          "example.com",
          "ssh-ed25519"
        )
        assert.strictEqual(files.get(path), original)
      }))

    it.effect("acceptNew fails when the file cannot be updated", () =>
      Effect.gen(function*() {
        const files = new Map<string, string>()
        const verify = yield* SshKnownHosts.fromFile(path, { acceptNew: true }).pipe(
          Effect.provideService(FileSystem.FileSystem, makeFileSystem(files, { failWrites: true }))
        )
        const error = yield* Effect.flip(verify(info("example.com", 22, ed25519)))
        assert.strictEqual(error.reason._tag, "SshKeyError")
        assert.include(error.message, `could not update ${path}`)
        assert.isFalse(files.has(path))
      }))
  })
})
