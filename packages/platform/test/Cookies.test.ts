import * as Cookies from "@effect/platform/Cookies"
import { describe, it } from "@effect/vitest"
import { throws } from "@effect/vitest/utils"

const assertCookieError = (f: () => void, message: Cookies.CookiesError["reason"]) => {
  throws(f, new Cookies.CookiesError({ reason: message }))
}

describe("Cookies", () => {
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
