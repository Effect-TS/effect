import { assert, it } from "@effect/vitest"
import { FindMyWay as Router } from "effect/http"

it("should sanitize the url - query", () => {
  const router = Router.make<boolean>()
  router.on("GET", "/test", true)
  assert.deepStrictEqual(
    router.find("GET", "/test?hello=world")?.searchParams,
    { hello: "world" }
  )
})

it("should sanitize the url - hash", () => {
  const router = Router.make<boolean>()

  router.on("GET", "/test", true)

  assert.deepStrictEqual(router.find("GET", "/test#hello")?.searchParams, {
    hello: ""
  })
})

it("handles path and query separated by ;", () => {
  const router = Router.make<boolean>()
  router.on("GET", "/test", true)
  assert.deepStrictEqual(
    router.find("GET", "/test;jsessionid=123456")?.searchParams,
    { jsessionid: "123456" }
  )
})

it("handles %", () => {
  const router = Router.make<boolean>()
  router.on("GET", "/test", true)
  assert.deepStrictEqual(router.find("GET", "/test?%")?.searchParams, {
    "%": ""
  })
})

it("preserves duplicate slashes in query URLs", () => {
  const router = Router.make<boolean>()
  router.on("GET", "/a", true)
  assert.deepStrictEqual(router.find("GET", "/a?u=https://x.com/y")?.searchParams, {
    u: "https://x.com/y"
  })
})

it("normalizes duplicate path slashes without changing query slashes", () => {
  const router = Router.make<boolean>()
  router.on("GET", "/a/b", true)
  const result = router.find("GET", "//a//b?u=https://x//y")
  assert.strictEqual(result?.handler, true)
  assert.deepStrictEqual(result?.searchParams, { u: "https://x//y" })
})

it("extracts parameters from normalized paths without changing query slashes", () => {
  const router = Router.make<boolean>()
  router.on("GET", "/user/:id", true)
  const result = router.find("GET", "//user//1?r=a//b")
  assert.strictEqual(result?.handler, true)
  assert.deepStrictEqual(result?.params, { id: "1" })
  assert.deepStrictEqual(result?.searchParams, { r: "a//b" })
})

it("preserves query URL slashes after the ; delimiter", () => {
  const router = Router.make<boolean>()
  router.on("GET", "/a", true)
  assert.deepStrictEqual(router.find("GET", "/a;u=https://x")?.searchParams, {
    u: "https://x"
  })
})
