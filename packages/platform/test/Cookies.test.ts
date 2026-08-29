import * as Cookies from "@effect/platform/Cookies"
import { describe, it } from "@effect/vitest"
import { deepStrictEqual, throws } from "@effect/vitest/utils"
import { Either, Option } from "effect"

const assertCookieError = (f: () => void, message: Cookies.CookiesError["reason"]) => {
  throws(f, new Cookies.CookiesError({ reason: message }))
}

describe("Cookies", () => {
  it("makeCookie rejects cookie attribute separators", () => {
    deepStrictEqual(
      Cookies.makeCookie("name; HttpOnly", "value"),
      Either.left(new Cookies.CookiesError({ reason: "InvalidName" }))
    )
    deepStrictEqual(
      Cookies.makeCookie("name", "value", { domain: "example.com; Domain=evil.com" }),
      Either.left(new Cookies.CookiesError({ reason: "InvalidDomain" }))
    )
    deepStrictEqual(
      Cookies.makeCookie("name", "value", { path: "/; HttpOnly" }),
      Either.left(new Cookies.CookiesError({ reason: "InvalidPath" }))
    )
  })

  it("makeCookie accepts RFC 6265 cookie fields", () => {
    const name = "!#$%&'*+-.^_`|~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    for (const domain of ["api.example.com", ".api.example.com"]) {
      const cookie = Either.getOrThrow(Cookies.makeCookie(name, "value", {
        domain,
        path: "/docs/a-b_c~d/%20"
      }))

      deepStrictEqual(
        Cookies.serializeCookie(cookie),
        `${name}=value; Domain=${domain}; Path=/docs/a-b_c~d/%20`
      )
    }
  })

  it("fromSetCookie validates cookie names", () => {
    deepStrictEqual(Cookies.fromSetCookie("name; HttpOnly=value"), Cookies.empty)
    deepStrictEqual(Cookies.fromSetCookie("name()=value"), Cookies.empty)

    const name = "!#$%&'*+-.^_`|~"
    deepStrictEqual(
      Cookies.getValue(Cookies.fromSetCookie(`${name}=value`), name),
      Option.some("value")
    )
  })

  it("unsafeMakeCookie", () => {
    assertCookieError(() => Cookies.unsafeMakeCookie("", "value"), "InvalidName")
    assertCookieError(() => Cookies.unsafeMakeCookie("name", "value", { domain: "" }), "InvalidDomain")
    assertCookieError(() => Cookies.unsafeMakeCookie("name", "value", { path: "" }), "InvalidPath")
    assertCookieError(() => Cookies.unsafeMakeCookie("name", "value", { maxAge: Infinity }), "InfinityMaxAge")
  })

  it("unsafeSetAll", () => {
    assertCookieError(() => Cookies.unsafeSetAll(Cookies.empty, [["", "value"]]), "InvalidName")
    assertCookieError(() => Cookies.unsafeSetAll(Cookies.empty, [["name", "value", { domain: "" }]]), "InvalidDomain")
    assertCookieError(() => Cookies.unsafeSetAll(Cookies.empty, [["name", "value", { path: "" }]]), "InvalidPath")
    assertCookieError(
      () => Cookies.unsafeSetAll(Cookies.empty, [["name", "value", { maxAge: Infinity }]]),
      "InfinityMaxAge"
    )
  })
})
