import { PgAuth } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { bytes, md5, scram } from "./fixtures/goldens.ts"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const assertThrowsTagged = (tag: string, run: () => unknown) => {
  try {
    run()
  } catch (error) {
    assert.strictEqual((error as { _tag?: string })._tag, tag)
    return
  }
  assert.fail(`Expected ${tag} to be thrown`)
}

describe("PgAuth", () => {
  describe("md5Password", () => {
    it("matches the response PostgreSQL accepted", () => {
      assert.strictEqual(
        PgAuth.md5Password({ user: md5.user, password: md5.password, salt: bytes(md5.salt) }),
        md5.expected
      )
    })

    it("depends on the salt", () => {
      const other = PgAuth.md5Password({
        user: md5.user,
        password: md5.password,
        salt: bytes("00000000")
      })
      assert.notStrictEqual(other, md5.expected)
    })
  })

  describe("SCRAM-SHA-256", () => {
    it("replays a captured PostgreSQL exchange", () => {
      const started = PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce })
      assert.strictEqual(decoder.decode(started.response), scram.clientFirstMessage)

      const continued = PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage))
      assert.strictEqual(decoder.decode(continued.response), scram.clientFinalMessage)

      PgAuth.scramFinish(continued.state, encoder.encode(scram.serverFinalMessage))
    })

    it("rejects a server nonce that does not extend the client nonce", () => {
      const started = PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce })
      assertThrowsTagged(
        "PgAuthError",
        () => PgAuth.scramContinue(started.state, encoder.encode("r=other,s=DBRmN4Xi9iMOo1tZfsi+Hg==,i=4096"))
      )
    })

    it("rejects a missing attribute", () => {
      const started = PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce })
      assertThrowsTagged(
        "PgAuthError",
        () => PgAuth.scramContinue(started.state, encoder.encode(`r=${scram.clientNonce}x,i=4096`))
      )
    })

    it("rejects a tampered server signature", () => {
      const started = PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce })
      const continued = PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage))
      assertThrowsTagged(
        "PgAuthError",
        () => PgAuth.scramFinish(continued.state, encoder.encode("v=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="))
      )
    })

    it("surfaces a server error attribute", () => {
      const started = PgAuth.scramInit({ password: scram.password, nonce: scram.clientNonce })
      const continued = PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage))
      assertThrowsTagged(
        "PgAuthError",
        () => PgAuth.scramFinish(continued.state, encoder.encode("e=invalid-proof"))
      )
    })

    it("rejects a nonce containing a comma", () => {
      assertThrowsTagged("PgAuthError", () => PgAuth.scramInit({ password: "x", nonce: "a,b" }))
    })

    it("derives a different proof for a different password", () => {
      const started = PgAuth.scramInit({ password: "wrong", nonce: scram.clientNonce })
      const continued = PgAuth.scramContinue(started.state, encoder.encode(scram.serverFirstMessage))
      assert.notStrictEqual(decoder.decode(continued.response), scram.clientFinalMessage)
      assertThrowsTagged(
        "PgAuthError",
        () => PgAuth.scramFinish(continued.state, encoder.encode(scram.serverFinalMessage))
      )
    })
  })
})
