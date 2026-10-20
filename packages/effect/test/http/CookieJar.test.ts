import { assert, describe, it } from "@effect/vitest"
import { CookieJar, Cookies } from "effect/http"

describe("CookieJar", () => {
  const now = Date.parse("2026-10-20T00:00:00Z")
  const header = (jar: CookieJar.CookieJar, url: string) => Cookies.toCookieHeader(CookieJar.cookiesFor(jar, url, now))

  it("isolates host-only cookies without overwriting another host's session", () => {
    const api = CookieJar.setFromResponse(
      CookieJar.empty,
      "https://api.example.com/account",
      Cookies.fromSetCookie("session=secret"),
      now
    )
    assert.strictEqual(header(api, "https://evil.example/hook"), "")

    const both = CookieJar.setFromResponse(
      api,
      "https://evil.example/hook",
      Cookies.fromSetCookie("session=attacker"),
      now
    )
    assert.strictEqual(header(both, "https://api.example.com/account"), "session=secret")
    assert.strictEqual(header(both, "https://evil.example/hook"), "session=attacker")
    assert.strictEqual(header(both, "https://sub.api.example.com/account"), "")
  })

  it("accepts matching Domain cookies but rejects foreign, single-label and IP domains", () => {
    const jar = CookieJar.setFromResponse(
      CookieJar.empty,
      "https://www.example.com/",
      Cookies.fromSetCookie("session=secret; Domain=example.com; Path=/"),
      now
    )
    assert.strictEqual(header(jar, "https://api.example.com/"), "session=secret")
    assert.strictEqual(header(jar, "https://example.com/"), "session=secret")
    assert.strictEqual(header(jar, "https://notexample.com/"), "")

    for (
      const [url, domain] of [
        ["https://evil.example/", "bank.example"],
        ["https://notexample.com/", "example.com"],
        ["https://www.example.com/", "com"],
        ["http://127.0.0.1/", "127.0.0.1"]
      ]
    ) {
      const rejected = CookieJar.setFromResponse(
        CookieJar.empty,
        url,
        Cookies.fromSetCookie("session=secret; Domain=" + domain),
        now
      )
      assert.isTrue(Cookies.isEmpty(CookieJar.cookiesFor(rejected, url, now)))
      assert.strictEqual(header(rejected, "https://bank.example/"), "")
    }
  })

  it("ignores a leading dot in constructed cookie domains", () => {
    const jar = CookieJar.setFromResponse(
      CookieJar.empty,
      "https://api.example.com/",
      Cookies.setUnsafe(Cookies.empty, "session", "secret", { domain: ".example.com", path: "/" }),
      now
    )
    assert.deepStrictEqual(
      [
        CookieJar.toCookieHeader(jar, "https://example.com/", now),
        CookieJar.toCookieHeader(jar, "https://www.example.com/", now),
        CookieJar.toCookieHeader(jar, "https://notexample.com/", now)
      ],
      ["session=secret", "session=secret", undefined]
    )
  })

  it("uses the response's default path and matches explicit paths on segment boundaries", () => {
    for (const cookie of ["session=secret", "session=secret; Path=/account"]) {
      const jar = CookieJar.setFromResponse(
        CookieJar.empty,
        "https://api.example.com/account/settings",
        Cookies.fromSetCookie(cookie),
        now
      )
      assert.strictEqual(header(jar, "https://api.example.com/account"), "session=secret")
      assert.strictEqual(header(jar, "https://api.example.com/account/other"), "session=secret")
      assert.strictEqual(header(jar, "https://api.example.com/"), "")
      assert.strictEqual(header(jar, "https://api.example.com/account2"), "")
    }
  })

  it("replaces a Domain cookie with a host-only cookie of the same name and path", () => {
    const domain = CookieJar.setFromResponse(
      CookieJar.empty,
      "https://example.com/",
      Cookies.fromSetCookie("session=domain; Domain=example.com; Path=/"),
      now
    )
    assert.strictEqual(CookieJar.toCookieHeader(domain, "https://sub.example.com/", now), "session=domain")

    const replaced = CookieJar.setFromResponse(
      domain,
      "https://example.com/",
      Cookies.fromSetCookie("session=host; Path=/"),
      now
    )
    assert.strictEqual(CookieJar.toCookieHeader(replaced, "https://example.com/", now), "session=host")
    assert.isUndefined(CookieJar.toCookieHeader(replaced, "https://sub.example.com/", now))
  })

  it("serializes same-name cookies longest path first while cookiesFor keeps the most specific", () => {
    const root = CookieJar.setFromResponse(
      CookieJar.empty,
      "https://example.com/",
      Cookies.fromSetCookie("session=root; Path=/"),
      now
    )
    const jar = CookieJar.setFromResponse(
      root,
      "https://example.com/account",
      Cookies.fromSetCookie("session=account; Path=/account"),
      now
    )
    assert.strictEqual(
      CookieJar.toCookieHeader(jar, "https://example.com/account/settings", now),
      "session=account; session=root"
    )
    assert.strictEqual(header(jar, "https://example.com/account/settings"), "session=account")
  })

  it("sends Secure cookies only over HTTPS", () => {
    const jar = CookieJar.setFromResponse(
      CookieJar.empty,
      "https://api.example.com/",
      Cookies.fromSetCookie("session=secret; Secure"),
      now
    )
    assert.strictEqual(header(jar, "https://api.example.com/"), "session=secret")
    assert.strictEqual(header(jar, "http://api.example.com/"), "")
  })

  it("deletes cookies with Max-Age=0 and does not send expired cookies", () => {
    const stored = CookieJar.setFromResponse(
      CookieJar.empty,
      "https://api.example.com/",
      Cookies.fromSetCookie("session=secret; Path=/"),
      now
    )
    assert.strictEqual(header(stored, "https://api.example.com/"), "session=secret")
    const removed = CookieJar.setFromResponse(
      stored,
      "https://api.example.com/",
      Cookies.fromSetCookie("session=; Path=/; Max-Age=0"),
      now
    )
    const expired = CookieJar.setFromResponse(
      CookieJar.empty,
      "https://api.example.com/",
      Cookies.fromSetCookie("session=secret; Expires=Mon, 01 Jan 2024 00:00:00 GMT"),
      now
    )
    assert.strictEqual(header(removed, "https://api.example.com/"), "")
    assert.strictEqual(header(expired, "https://api.example.com/"), "")
  })
})
