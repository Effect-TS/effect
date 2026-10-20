import { assert, describe, it } from "@effect/vitest"
import { assertNone, assertSome, deepStrictEqual } from "@effect/vitest/utils"
import { Result, Schema } from "effect"
import { Cookies } from "effect/http"
import * as Option from "effect/Option"
import { TestSchema } from "effect/testing"
import { assertFailure, assertSuccess } from "../utils/assert.ts"

describe("Cookies", () => {
  describe("makeCookie", () => {
    it("rejects cookie attribute delimiters in names, domains, and paths", () => {
      assertFailure(
        Cookies.makeCookie("a; Domain=evil.com; b", "token"),
        Cookies.CookiesError.fromReason("InvalidCookieName")
      )
      assertFailure(
        Cookies.makeCookie("session", "token", { domain: "legit.com; Domain=.parent.tld" }),
        Cookies.CookiesError.fromReason("InvalidCookieDomain")
      )
      assertFailure(
        Cookies.makeCookie("session", "token", { path: "/; HttpOnly" }),
        Cookies.CookiesError.fromReason("InvalidCookiePath")
      )
    })

    it("accepts RFC 6265 token names and legitimate domains and paths", () => {
      for (const domain of ["sub.example.com", ".sub.example.com"]) {
        const cookie = Result.getOrThrow(
          Cookies.makeCookie("!#$%&'*+-.^_`|~", "token", {
            domain,
            path: "/some-path_with~chars/%20"
          })
        )

        assert.strictEqual(
          Cookies.serializeCookie(cookie),
          `!#$%&'*+-.^_\`|~=token; Domain=${domain}; Path=/some-path_with~chars/%20`
        )
      }
    })
  })

  describe("fromSetCookie", () => {
    it("ignores invalid cookie names", () => {
      const cookies = Cookies.fromSetCookie([
        "bad name=value",
        "session=abc"
      ])

      assertNone(Cookies.get(cookies, "bad name"))
      assertSome(Cookies.getValue(cookies, "session"), "abc")
    })
  })

  describe("toSetCookieHeaders", () => {
    const invalidCookie = {
      name: "session",
      value: "token",
      valueEncoded: "token",
      options: { domain: "legit.com; Domain=.evil.com" }
    } as unknown as Cookies.Cookie

    it("rejects invalid cookies supplied through fromIterable", () => {
      const cookies = Cookies.fromIterable([invalidCookie])

      assert.throws(() => Cookies.toSetCookieHeaders(cookies), /InvalidCookieDomain/)
    })

    it("rejects invalid cookies supplied through setCookie", () => {
      const cookies = Cookies.setCookie(Cookies.empty, invalidCookie)

      assert.throws(() => Cookies.toSetCookieHeaders(cookies), /InvalidCookieDomain/)
    })
  })

  it("expireCookie returns a Result with an expired Set-Cookie value", () => {
    assertSuccess(
      Cookies.expireCookie(Cookies.empty, "session", { path: "/", secure: true }),
      Cookies.fromReadonlyRecord({
        session: Cookies.makeCookieUnsafe("session", "", {
          path: "/",
          secure: true,
          maxAge: 0,
          expires: new Date(0)
        })
      })
    )
  })

  it("expireCookieUnsafe adds an expired Set-Cookie value", () => {
    deepStrictEqual(
      Cookies.expireCookieUnsafe(Cookies.empty, "session", { path: "/", secure: true }),
      Cookies.fromReadonlyRecord({
        session: Cookies.makeCookieUnsafe("session", "", {
          path: "/",
          secure: true,
          maxAge: 0,
          expires: new Date(0)
        })
      })
    )
  })

  describe("Schema.Cookies", () => {
    it("serializerIso annotation", () => {
      const _sessionId = Schema.toIso(Schema.Cookies).at("sessionId")
      const cookies = Cookies.fromSetCookie([
        "sessionId=abc123; Path=/; HttpOnly; Secure",
        "theme=dark; Path=/; Max-Age=3600",
        "language=en; Domain=.example.com; SameSite=Lax"
      ])
      assertSuccess(
        _sessionId.getResult(cookies),
        Cookies.makeCookieUnsafe("sessionId", "abc123", { path: "/", httpOnly: true, secure: true })
      )
    })

    it("toCodecJson", async () => {
      const schema = Schema.Cookies
      const asserts = new TestSchema.Asserts(Schema.toCodecJson(Schema.toType(schema)))

      const encoding = asserts.encoding()

      await encoding.succeed(
        Cookies.fromSetCookie([
          "sessionId=abc123; Path=/; HttpOnly; Secure",
          "theme=dark; Path=/; Max-Age=3600",
          "language=en; Domain=.example.com; SameSite=Lax"
        ]),
        [
          "sessionId=abc123; Path=/; HttpOnly; Secure",
          "theme=dark; Max-Age=3600; Path=/",
          "language=en; Domain=example.com; SameSite=Lax"
        ]
      )
    })
  })

  it("RecordFromCookies converts cookies to decoded string values", () => {
    const cookies = Cookies.fromSetCookie(["session=abc", "theme=dark"])

    deepStrictEqual(Schema.decodeSync(Schema.RecordFromCookies)(cookies), {
      session: "abc",
      theme: "dark"
    })
    deepStrictEqual(
      Cookies.toSetCookieHeaders(
        Schema.encodeSync(Schema.RecordFromCookies)({ session: "abc", theme: "dark" })
      ),
      ["session=abc", "theme=dark"]
    )
  })

  describe("request jar", () => {
    const now = Date.parse("2026-10-20T00:00:00Z")
    const header = (jar: Cookies.Cookies, url: string) => Cookies.toRequestCookieHeader(jar, url, now)

    it("keeps a host-only cookie on the response host", () => {
      const jar = Cookies.storeFromResponse(
        Cookies.empty,
        Cookies.fromSetCookie("session=secret; Secure"),
        "https://api.example.com/account",
        now
      )

      assert.strictEqual(header(jar, "https://api.example.com/account"), "session=secret")
      assert.strictEqual(header(jar, "https://api.example.com/other"), "session=secret")
      assert.strictEqual(header(jar, "https://evil.example/hook"), undefined)
      assert.strictEqual(header(jar, "https://sub.api.example.com/"), undefined)
      assert.strictEqual(header(jar, "http://api.example.com/account"), undefined)
    })

    it("sends a Domain cookie only to that domain", () => {
      const jar = Cookies.storeFromResponse(
        Cookies.empty,
        Cookies.fromSetCookie("session=secret; Domain=example.com; Path=/"),
        "https://www.example.com/",
        now
      )

      assert.strictEqual(header(jar, "https://www.example.com/"), "session=secret")
      assert.strictEqual(header(jar, "https://api.example.com/"), "session=secret")
      assert.strictEqual(header(jar, "https://example.com/"), "session=secret")
      assert.strictEqual(header(jar, "https://notexample.com/"), undefined)
      assert.strictEqual(header(jar, "https://example.org/"), undefined)
    })

    it("drops a Domain that does not match the response host", () => {
      const widened = Cookies.storeFromResponse(
        Cookies.empty,
        Cookies.fromSetCookie("session=x; Domain=com"),
        "https://evil.example/",
        now
      )
      const foreign = Cookies.storeFromResponse(
        Cookies.empty,
        Cookies.fromSetCookie("session=x; Domain=bank.example"),
        "https://evil.example/",
        now
      )

      assert.strictEqual(header(widened, "https://bank.example/"), undefined)
      assert.strictEqual(header(widened, "https://evil.example/"), undefined)
      assert.strictEqual(header(foreign, "https://bank.example/"), undefined)
      assert.strictEqual(header(foreign, "https://evil.example/"), undefined)
    })

    it("does not let another host replace a cookie of the same name", () => {
      const api = Cookies.storeFromResponse(
        Cookies.empty,
        Cookies.fromSetCookie("session=secret"),
        "https://api.example.com/",
        now
      )
      const both = Cookies.storeFromResponse(
        api,
        Cookies.fromSetCookie("session=attacker"),
        "https://evil.example/",
        now
      )

      assert.strictEqual(header(both, "https://api.example.com/"), "session=secret")
      assert.strictEqual(header(both, "https://evil.example/"), "session=attacker")
    })

    it("limits a cookie to the default path of the response", () => {
      const jar = Cookies.storeFromResponse(
        Cookies.empty,
        Cookies.fromSetCookie("session=secret"),
        "https://api.example.com/account/settings",
        now
      )

      assert.strictEqual(header(jar, "https://api.example.com/account/settings"), "session=secret")
      assert.strictEqual(header(jar, "https://api.example.com/account/other"), "session=secret")
      assert.strictEqual(header(jar, "https://api.example.com/"), undefined)
      assert.strictEqual(header(jar, "https://api.example.com/account2"), undefined)
    })

    it("removes a cookie when Max-Age is zero and skips expired cookies", () => {
      const stored = Cookies.storeFromResponse(
        Cookies.empty,
        Cookies.fromSetCookie("session=secret; Path=/"),
        "https://api.example.com/",
        now
      )
      const removed = Cookies.storeFromResponse(
        stored,
        Cookies.fromSetCookie("session=; Path=/; Max-Age=0"),
        "https://api.example.com/",
        now
      )
      const expired = Cookies.storeFromResponse(
        Cookies.empty,
        Cookies.fromSetCookie("session=secret; Path=/; Expires=Mon, 01 Jan 2024 00:00:00 GMT"),
        "https://api.example.com/",
        now
      )

      assert.strictEqual(header(removed, "https://api.example.com/"), undefined)
      assert.strictEqual(header(expired, "https://api.example.com/"), undefined)
    })

    it("still sends a cookie that was stored with no domain", () => {
      const jar = Cookies.setUnsafe(Cookies.empty, "token", "foo")

      assert.strictEqual(header(jar, "https://api.example.com/"), "token=foo")
      assert.strictEqual(header(jar, "https://evil.example/"), "token=foo")
    })
  })

  it("get and getValue return Option", () => {
    const cookies = Cookies.fromSetCookie("session=abc; Path=/")
    assert.isTrue(Option.isSome(Cookies.get(cookies, "session")))
    assertSome(Cookies.getValue(cookies, "session"), "abc")
    assertNone(Cookies.get(cookies, "missing"))
    assertNone(Cookies.getValue(cookies, "missing"))
    assertNone(Cookies.get(Cookies.empty, "constructor"))
  })

  it("identifies cookies errors", () => {
    assert.isTrue(Cookies.isCookiesError(Cookies.CookiesError.fromReason("InvalidCookieName")))
    assert.isFalse(Cookies.isCookiesError({ _tag: "CookiesError" }))
    assert.isFalse(Cookies.isCookiesError(null))
  })
})
