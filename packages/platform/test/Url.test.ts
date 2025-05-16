import * as Url from "@effect/platform/Url"
import * as UrlParams from "@effect/platform/UrlParams"
import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Cause, Either, Redacted } from "effect"

describe("Url", () => {
  const testURL = new URL("https://example.com/test")

  const expectUrl = (updatedUrl: URL, expected: string) => {
    assertTrue(updatedUrl !== testURL)
    assertTrue(updatedUrl.toString() !== testURL.toString())
    deepStrictEqual(updatedUrl.toString(), expected)
  }

  describe("fromString", () => {
    it("success", () => {
      const url = Url.fromString(testURL.toString())
      deepStrictEqual(url, Either.right(testURL))
    })

    it("failure", () => {
      const error = Url.fromString("??")
      deepStrictEqual(error, Either.left(new Cause.IllegalArgumentException("Invalid URL")))
    })
  })

  it("mutate", () => {
    expectUrl(
      Url.mutate(testURL, (url) => {
        url.username = "user"
        url.password = "pass"
      }),
      "https://user:pass@example.com/test"
    )
  })

  it("setHash", () => {
    expectUrl(Url.setHash(testURL, "test"), "https://example.com/test#test")
  })

  it("setHost", () => {
    expectUrl(Url.setHost(testURL, "newhost.com"), "https://newhost.com/test")
  })

  it("setHostname", () => {
    expectUrl(Url.setHostname(testURL, "newhostname.com"), "https://newhostname.com/test")
  })

  it("setHref", () => {
    expectUrl(Url.setHref(testURL, "https://newhref.com"), "https://newhref.com/")
  })

  it("setPassword", () => {
    expectUrl(Url.setPassword(testURL, "newpassword"), "https://:newpassword@example.com/test")
  })

  it("setPassword - Redacted", () => {
    expectUrl(Url.setPassword(testURL, Redacted.make("newpassword")), "https://:newpassword@example.com/test")
  })

  it("setPathname", () => {
    expectUrl(Url.setPathname(testURL, "/newpath"), "https://example.com/newpath")
  })

  it("setPort", () => {
    expectUrl(Url.setPort(testURL, "8080"), "https://example.com:8080/test")
    expectUrl(Url.setPort(testURL, 8080), "https://example.com:8080/test")
  })

  it("setProtocol", () => {
    expectUrl(Url.setProtocol(testURL, "http"), "http://example.com/test")
  })

  it("setSearch", () => {
    expectUrl(Url.setSearch(testURL, "?key=value"), "https://example.com/test?key=value")
  })

  it("setUsername", () => {
    expectUrl(Url.setUsername(testURL, "newuser"), "https://newuser@example.com/test")
  })

  it("modifyUrlParams", () => {
    expectUrl(Url.modifyUrlParams(testURL, UrlParams.append("key", "value")), "https://example.com/test?key=value")
  })

  it("urlParams", () => {
    const params = Url.urlParams(new URL("https://example.com?foo=bar&baz=qux"))
    deepStrictEqual(params, UrlParams.fromInput([["foo", "bar"], ["baz", "qux"]]))
  })

  it("setUrlParams", () => {
    const url = new URL("https://example.com/?foo=bar&a=b")
    const newParams = UrlParams.fromInput([["foo", "bar2"], ["baz", "qux"]])
    const updatedUrl = Url.setUrlParams(url, newParams)
    expectUrl(updatedUrl, "https://example.com/?foo=bar2&baz=qux")
  })
})
