import * as Cookies from "@effect/platform/Cookies"
import { describe, expect, it } from "vitest"

describe("Cookies", () => {
  it("unsafeMakeCookie", () => {
    expect(() => Cookies.unsafeMakeCookie("", "value")).toThrow(new Error("InvalidName"))
    expect(() => Cookies.unsafeMakeCookie("name", "value", { domain: "" })).toThrow(new Error("InvalidDomain"))
    expect(() => Cookies.unsafeMakeCookie("name", "value", { path: "" })).toThrow(new Error("InvalidPath"))
    expect(() => Cookies.unsafeMakeCookie("name", "value", { maxAge: Infinity })).toThrow(new Error("InfinityMaxAge"))
  })

  it("unsafeSetAll", () => {
    expect(() => Cookies.unsafeSetAll(Cookies.empty, [["", "value"]])).toThrow(new Error("InvalidName"))
    expect(() => Cookies.unsafeSetAll(Cookies.empty, [["name", "value", { domain: "" }]])).toThrow(
      new Error("InvalidDomain")
    )
    expect(() => Cookies.unsafeSetAll(Cookies.empty, [["name", "value", { path: "" }]])).toThrow(
      new Error("InvalidPath")
    )
    expect(() => Cookies.unsafeSetAll(Cookies.empty, [["name", "value", { maxAge: Infinity }]])).toThrow(
      new Error("InfinityMaxAge")
    )
  })
})
