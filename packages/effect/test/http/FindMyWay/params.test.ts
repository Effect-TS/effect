import { assert, describe, it } from "@effect/vitest"
import { FindMyWay as Router } from "effect/http"

describe("FindMyWay params", () => {
  it("builds null-prototype params for static, single and multi-parameter routes", () => {
    const router = Router.make<number>()
    router.on("GET", "/health", 1)
    router.on("GET", "/users/:id", 2)
    router.on("GET", "/orgs/:org/repos/:repo", 3)

    for (
      const [path, expected] of [
        ["/health", {}],
        ["/users/42", { id: "42" }],
        ["/orgs/effect/repos/effect", { org: "effect", repo: "effect" }]
      ] as const
    ) {
      const params = router.find("GET", path)!.params
      assert.strictEqual(Object.getPrototypeOf(params), null)
      assert.deepStrictEqual({ ...params }, expected)
    }
  })

  it("stores prototype-sensitive parameter names as own properties", () => {
    const router = Router.make<number>()
    router.on("GET", "/a/:__proto__/b/:constructor/c/:toString", 1)

    const params = router.find("GET", "/a/x/b/y/c/z")!.params
    assert.strictEqual(Object.getPrototypeOf(params), null)
    assert.deepStrictEqual(Object.entries(params), [["__proto__", "x"], ["constructor", "y"], ["toString", "z"]])
  })

  it("does not construct functions from strings", () => {
    const OriginalFunction = globalThis.Function
    let constructed = 0
    globalThis.Function = new Proxy(OriginalFunction, {
      apply(target, thisArg, args) {
        constructed++
        return Reflect.apply(target, thisArg, args)
      },
      construct(target, args, newTarget) {
        constructed++
        return Reflect.construct(target, args, newTarget)
      }
    })
    try {
      const router = Router.make<number>()
      router.on("GET", "/users/:id", 1)
      router.on("GET", "/orgs/:org/repos/:repo", 2)
      router.on("GET", "/files/*", 3)
      assert.deepStrictEqual({ ...router.find("GET", "/orgs/effect/repos/effect")!.params }, {
        org: "effect",
        repo: "effect"
      })
      assert.deepStrictEqual({ ...router.find("GET", "/files/a/b")!.params }, { "*": "a/b" })
    } finally {
      globalThis.Function = OriginalFunction
    }
    assert.strictEqual(constructed, 0)
  })
})
