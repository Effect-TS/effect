import { describe, it } from "@effect/vitest"
import { Cause, Redacted, Result } from "effect"

import { Url, UrlParams } from "effect/http"
import {
  assertFailure,
  assertInstanceOf,
  assertSuccess,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from "../utils/assert.ts"

describe("Url", () => {
  const testURL = new URL("https://example.com/test")

  const expectUrl = (updatedUrl: URL, expected: string) => {
    assertTrue(updatedUrl !== testURL)
    assertTrue(updatedUrl.toString() !== testURL.toString())
    strictEqual(updatedUrl.toString(), expected)
  }

  describe("make", () => {
    it("appends query parameters and hash", () => {
      assertSuccess(
        Url.make(
          "https://example.com/test?existing=true",
          UrlParams.fromInput([["foo", "bar"], ["foo", "baz"]]),
          "section"
        ),
        new URL("https://example.com/test?existing=true&foo=bar&foo=baz#section")
      )
    })

    it("fails when the URL cannot be constructed", () => {
      const result = Url.make("http://%", UrlParams.empty, undefined)

      assertTrue(Result.isFailure(result))
      assertInstanceOf(result.failure, Url.UrlError)
    })
  })

  describe("fromString", () => {
    it("parses absolute URLs", () => {
      const url = Url.fromString(testURL.toString())
      assertSuccess(url, testURL)
    })

    it("resolves relative URLs against a base URL", () => {
      const error = Url.fromString("??")
      assertFailure(error, new Cause.IllegalArgumentError("Invalid URL: \"??\""))
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

  it("setUrlParams percent-encodes spaces", () => {
    const url = new URL("https://example.com/")
    const updatedUrl = Url.setUrlParams(url, UrlParams.fromInput([["foo", "bar baz"]]))
    strictEqual(updatedUrl.toString(), "https://example.com/?foo=bar%20baz")
  })

  it("setUrlParams encodes a literal plus sign as %2B", () => {
    const url = new URL("https://example.com/")
    const updatedUrl = Url.setUrlParams(url, UrlParams.fromInput([["foo", "a+b"]]))
    strictEqual(updatedUrl.toString(), "https://example.com/?foo=a%2Bb")
  })

  describe("modifyUrlParams preserves percent encoding", () => {
    const identity = (params: UrlParams.UrlParams) => params

    it("keeps %20 in an untouched parameter", () => {
      const url = new URL("https://example.com?foo=bar%20baz")
      const updatedUrl = Url.modifyUrlParams(url, identity)
      strictEqual(updatedUrl.href, url.href)
    })

    it("keeps %20 when another parameter is added", () => {
      const url = new URL("https://example.com?foo=bar%20baz")
      const updatedUrl = Url.modifyUrlParams(url, UrlParams.append("key", "value"))
      strictEqual(updatedUrl.toString(), "https://example.com/?foo=bar%20baz&key=value")
    })

    it("keeps %20 when another parameter is removed", () => {
      const url = new URL("https://example.com?foo=bar%20baz&drop=me")
      const updatedUrl = Url.modifyUrlParams(url, UrlParams.remove("drop"))
      strictEqual(updatedUrl.toString(), "https://example.com/?foo=bar%20baz")
    })

    it("encodes a space in a newly added value", () => {
      const url = new URL("https://example.com?foo=bar")
      const updatedUrl = Url.modifyUrlParams(url, UrlParams.append("key", "a b"))
      strictEqual(updatedUrl.toString(), "https://example.com/?foo=bar&key=a%20b")
    })

    it("encodes a literal plus sign as %2B rather than a space", () => {
      const url = new URL("https://example.com?foo=bar")
      const updatedUrl = Url.modifyUrlParams(url, UrlParams.append("key", "a+b"))
      strictEqual(updatedUrl.toString(), "https://example.com/?foo=bar&key=a%2Bb")
    })

    it("keeps a percent-encoded plus sign from the original url", () => {
      const url = new URL("https://example.com?foo=a%2Bb")
      const updatedUrl = Url.modifyUrlParams(url, UrlParams.append("key", "value"))
      strictEqual(updatedUrl.toString(), "https://example.com/?foo=a%2Bb&key=value")
    })

    it("encodes a space in a parameter key", () => {
      const url = new URL("https://example.com?foo=bar")
      const updatedUrl = Url.modifyUrlParams(url, UrlParams.append("a key", "v"))
      strictEqual(updatedUrl.toString(), "https://example.com/?foo=bar&a%20key=v")
    })
  })
})
