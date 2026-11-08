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
    it("preserves scopes and replaces normalized identities in place", () => {
      const cookies = Cookies.fromSetCookie([
        "token=root; Path=/",
        "token=api; Path=/api",
        "token=x; Domain=.Example.COM",
        "token=y; Domain=example.com"
      ])

      deepStrictEqual(Cookies.toSetCookieHeaders(cookies), [
        "token=root; Path=/",
        "token=api; Path=/api",
        "token=y; Domain=example.com"
      ])
      assertSome(Cookies.getValue(cookies, "token"), "y")
    })

    it("trims cookie pairs and ignores invalid cookie names", () => {
      const cookies = Cookies.fromSetCookie([
        "bad name=value",
        "session\t=\tabc",
        "encoded = %20abc%20"
      ])

      assertNone(Cookies.get(cookies, "bad name"))
      assertSome(Cookies.getValue(cookies, "session"), "abc")
      assertSome(Cookies.getValue(cookies, "encoded"), " abc ")
    })

    it("ignores invalid Max-Age attributes", () => {
      deepStrictEqual(
        Cookies.toSetCookieHeaders(Cookies.fromSetCookie([
          "session=abc; Max-Age=0oops",
          "theme=dark; Max-Age=60; Max-Age=1.5"
        ])),
        ["session=abc", "theme=dark; Max-Age=60"]
      )
    })
  })

  describe("parseHeader", () => {
    it("unquotes values surrounded by whitespace", () => {
      deepStrictEqual(Cookies.parseHeader("a=\"1\" ; b= \"2\""), { a: "1", b: "2" })
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
      const cookies = Cookies.fromSetCookie([
        "sessionId=abc123; Path=/; HttpOnly; Secure",
        "sessionId=api; Path=/api"
      ])
      deepStrictEqual(Schema.encodeSync(Schema.toCodecIso(Schema.Cookies))(cookies), [
        Cookies.makeCookieUnsafe("sessionId", "abc123", { path: "/", httpOnly: true, secure: true }),
        Cookies.makeCookieUnsafe("sessionId", "api", { path: "/api" })
      ])
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

  it("sets and expires individual scopes, and removes every scope by name", () => {
    const cookies = Cookies.empty.pipe(
      Cookies.setCookie(Cookies.makeCookieUnsafe("token", "root", { path: "/" })),
      Cookies.setCookie(Cookies.makeCookieUnsafe("token", "api", { path: "/api" }))
    )
    deepStrictEqual(Cookies.toSetCookieHeaders(cookies), ["token=root; Path=/", "token=api; Path=/api"])

    const expired = Cookies.expireCookieUnsafe(cookies, "token", { path: "/" })
    deepStrictEqual(Cookies.toSetCookieHeaders(expired), [
      "token=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "token=api; Path=/api"
    ])
    assert.isTrue(Cookies.isEmpty(Cookies.remove(expired, "token")))
  })

  describe("scoped storage", () => {
    const now = Date.parse("2026-10-20T00:00:00Z")
    const header = (jar: ReadonlyArray<Cookies.Cookie>, url: string) => Cookies.toRequestCookieHeader(jar, url, now)

    it("stores and expires host-only and domain sessions from the same response", () => {
      const url = "https://www.example.com/"
      const jar = Cookies.mergeIntoArray(
        [],
        url,
        Cookies.fromSetCookie([
          "session=host; Path=/",
          "session=domain; Domain=example.com; Path=/"
        ]),
        now
      )
      assert.strictEqual(header(jar, url), "session=host; session=domain")
      assert.strictEqual(header(jar, "https://api.example.com/"), "session=domain")

      const expired = Cookies.mergeIntoArray(
        jar,
        url,
        Cookies.fromSetCookie([
          "session=; Max-Age=0; Path=/",
          "session=; Max-Age=0; Domain=example.com; Path=/"
        ]),
        now
      )
      deepStrictEqual(expired, [])
    })

    it("isolates host-only cookies without overwriting another host's session", () => {
      const api = Cookies.mergeIntoArray(
        [],
        "https://api.example.com/account",
        Cookies.fromSetCookie("session=secret"),
        now
      )
      assert.strictEqual(header(api, "https://evil.example/hook"), undefined)

      const both = Cookies.mergeIntoArray(
        api,
        "https://evil.example/hook",
        Cookies.fromSetCookie("session=attacker"),
        now
      )
      assert.strictEqual(header(both, "https://api.example.com/account"), "session=secret")
      assert.strictEqual(header(both, "https://evil.example/hook"), "session=attacker")
      assert.strictEqual(header(both, "https://sub.api.example.com/account"), undefined)
    })

    it("accepts matching Domain cookies but rejects foreign, single-label and IP domains", () => {
      const jar = Cookies.mergeIntoArray(
        [],
        "https://www.example.com/",
        Cookies.fromSetCookie("session=secret; Domain=example.com; Path=/"),
        now
      )
      assert.strictEqual(header(jar, "https://api.example.com/"), "session=secret")
      assert.strictEqual(header(jar, "https://example.com/"), "session=secret")
      assert.strictEqual(header(jar, "https://notexample.com/"), undefined)

      for (
        const [url, domain] of [
          ["https://evil.example/", "bank.example"],
          ["https://notexample.com/", "example.com"],
          ["https://www.example.com/", "com"],
          ["http://127.0.0.1/", "127.0.0.1"]
        ]
      ) {
        const rejected = Cookies.mergeIntoArray(
          [],
          url,
          Cookies.fromSetCookie("session=secret; Domain=" + domain),
          now
        )
        assert.isUndefined(header(rejected, url))
        assert.strictEqual(header(rejected, "https://bank.example/"), undefined)
      }
    })

    it("normalizes leading dots and case in seeded cookie domains", () => {
      const seeded = [Cookies.makeCookieUnsafe("session", "secret", { domain: ".EXAMPLE.com", path: "/" })]
      for (
        const jar of [
          seeded,
          Cookies.mergeIntoArray([], "https://api.example.com/", Cookies.fromIterable(seeded), now)
        ]
      ) {
        assert.deepStrictEqual(
          [
            Cookies.toRequestCookieHeader(jar, "https://example.com/", now),
            Cookies.toRequestCookieHeader(jar, "https://www.example.com/", now),
            Cookies.toRequestCookieHeader(jar, "https://notexample.com/", now)
          ],
          ["session=secret", "session=secret", undefined]
        )
      }
    })

    it("uses the response's default path and matches explicit paths on segment boundaries", () => {
      for (const cookie of ["session=secret", "session=secret; Path=/account"]) {
        const jar = Cookies.mergeIntoArray(
          [],
          "https://api.example.com/account/settings",
          Cookies.fromSetCookie(cookie),
          now
        )
        assert.strictEqual(header(jar, "https://api.example.com/account"), "session=secret")
        assert.strictEqual(header(jar, "https://api.example.com/account/other"), "session=secret")
        assert.strictEqual(header(jar, "https://api.example.com/"), undefined)
        assert.strictEqual(header(jar, "https://api.example.com/account2"), undefined)
      }
    })

    it("replaces a Domain cookie with a host-only cookie of the same name and path", () => {
      const domain = Cookies.mergeIntoArray(
        [],
        "https://example.com/",
        Cookies.fromSetCookie("session=domain; Domain=example.com; Path=/"),
        now
      )
      assert.strictEqual(Cookies.toRequestCookieHeader(domain, "https://sub.example.com/", now), "session=domain")

      const replaced = Cookies.mergeIntoArray(
        domain,
        "https://example.com/",
        Cookies.fromSetCookie("session=host; Path=/"),
        now
      )
      assert.strictEqual(Cookies.toRequestCookieHeader(replaced, "https://example.com/", now), "session=host")
      assert.isUndefined(Cookies.toRequestCookieHeader(replaced, "https://sub.example.com/", now))
      assert.strictEqual(Cookies.serializeCookie(replaced[0]), "session=host; Path=/")
    })

    it("serializes same-name cookies longest path first", () => {
      const root = Cookies.mergeIntoArray(
        [],
        "https://example.com/",
        Cookies.fromSetCookie("session=root; Path=/"),
        now
      )
      const jar = Cookies.mergeIntoArray(
        root,
        "https://example.com/account",
        Cookies.fromSetCookie("session=account; Path=/account"),
        now
      )
      assert.strictEqual(
        Cookies.toRequestCookieHeader(jar, "https://example.com/account/settings", now),
        "session=account; session=root"
      )
    })

    it("sends Secure cookies only over HTTPS", () => {
      const jar = Cookies.mergeIntoArray(
        [],
        "https://api.example.com/",
        Cookies.fromSetCookie("session=secret; Secure"),
        now
      )
      assert.strictEqual(header(jar, "https://api.example.com/"), "session=secret")
      assert.strictEqual(header(jar, "http://api.example.com/"), undefined)
    })

    it("deletes cookies with Max-Age=0 and does not send expired cookies", () => {
      const stored = Cookies.mergeIntoArray(
        [],
        "https://api.example.com/",
        Cookies.fromSetCookie("session=secret; Path=/"),
        now
      )
      assert.strictEqual(header(stored, "https://api.example.com/"), "session=secret")
      const removed = Cookies.mergeIntoArray(
        stored,
        "https://api.example.com/",
        Cookies.fromSetCookie("session=; Path=/; Max-Age=0"),
        now
      )
      const expired = Cookies.mergeIntoArray(
        [],
        "https://api.example.com/",
        Cookies.fromSetCookie("session=secret; Expires=Mon, 01 Jan 2024 00:00:00 GMT"),
        now
      )
      assert.strictEqual(header(removed, "https://api.example.com/"), undefined)
      assert.strictEqual(header(expired, "https://api.example.com/"), undefined)
    })
  })
})
