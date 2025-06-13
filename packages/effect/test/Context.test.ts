import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertInclude,
  assertInstanceOf,
  assertMatch,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { Context, Differ, Option, pipe } from "effect"

interface A {
  a: number
}
const A = Context.GenericTag<A>("A")

interface B {
  b: number
}
const B = Context.GenericTag<B>("B")

interface C {
  c: number
}
const C = Context.GenericTag<C>("C")

class D extends Context.Tag("D")<D, { readonly d: number }>() {}

class E extends Context.Reference<E>()("E", {
  defaultValue: () => ({ e: 0 })
}) {}

describe("Context", () => {
  it("error messages", () => {
    throws(() => {
      Context.unsafeGet(Context.empty(), A)
    }, (e) => {
      assertInstanceOf(e, Error)
      assertInclude(e.message, "Service not found: A")
    })
    throws(() => {
      Context.get(Context.empty(), A as never)
    }, (e) => {
      assertInstanceOf(e, Error)
      assertInclude(e.message, "Service not found: A")
    })
    throws(() => {
      Context.unsafeGet(Context.empty(), C)
    }, (e) => {
      assertInstanceOf(e, Error)
      assertInclude(e.message, "Service not found: C")
    })
    throws(() => {
      Context.get(Context.empty(), C as never)
    }, (e) => {
      assertInstanceOf(e, Error)
      assertInclude(e.message, "Service not found: C")
    })
    if (typeof window === "undefined") {
      throws(
        () => {
          Context.get(Context.empty(), C as never)
        },
        (e) => {
          assertInstanceOf(e, Error)
          assertMatch(e.message, /Service not found: C \(defined at (.*)Context.test.ts:29:19\)/)
        }
      )
      throws(
        () => {
          Context.get(Context.empty(), D as never)
        },
        (e) => {
          assertInstanceOf(e, Error)
          assertMatch(e.message, /Service not found: D \(defined at (.*)Context.test.ts:31:32\)/)
        }
      )
    }
  })

  it("Tag.toJson()", () => {
    const json: any = A.toJSON()
    strictEqual(json["_id"], "Tag")
    strictEqual(json["key"], "A")
    strictEqual(typeof json["stack"], "string")
  })

  it("TagClass.toJson()", () => {
    const json: any = D.toJSON()
    strictEqual(json["_id"], "Tag")
    strictEqual(json["key"], "D")
    strictEqual(typeof json["stack"], "string")
  })

  it("Context.toJson()", () => {
    const json: any = Context.empty().toJSON()
    strictEqual(json["_id"], "Context")
    deepStrictEqual(json["services"], [])
  })

  it("aliased tags", () => {
    interface Foo {
      readonly _tag: "Foo"
    }
    interface Bar {
      readonly _tag: "Bar"
    }
    interface FooBar {
      readonly FooBar: unique symbol
    }
    const Service = Context.GenericTag<FooBar, Foo | Bar>("FooBar")
    const context = Context.make(Service, { _tag: "Foo" }).pipe(
      Context.add(Service, { _tag: "Foo" })
    )
    deepStrictEqual(Context.get(context, Service), { _tag: "Foo" })
  })

  it("adds and retrieve services", () => {
    const Services = pipe(
      Context.make(A, { a: 0 }),
      Context.add(B, { b: 1 }),
      Context.add(D, { d: 2 })
    )

    deepStrictEqual(Context.get(Services, A), { a: 0 })
    assertSome(pipe(Services, Context.getOption(B)), { b: 1 })
    deepStrictEqual(pipe(Services, Context.get(D)), { d: 2 })
    assertNone(pipe(Services, Context.getOption(C)))
    deepStrictEqual(pipe(Services, Context.get(E)), { e: 0 })

    throws(() => {
      pipe(
        Services,
        Context.unsafeGet(C)
      )
    }, (e) => {
      assertInstanceOf(e, Error)
      assertInclude(e.message, "Service not found: C")
    })
  })

  it("picks services in env and merges", () => {
    const env = pipe(
      Context.empty(),
      Context.add(A, { a: 0 }),
      Context.merge(pipe(
        Context.empty(),
        Context.add(B, { b: 1 }),
        Context.add(C, { c: 2 })
      ))
    )

    const pruned = pipe(
      env,
      Context.pick(A, B)
    )

    deepStrictEqual(pipe(pruned, Context.get(A)), { a: 0 })
    assertSome(pipe(pruned, Context.getOption(B)), { b: 1 })
    assertNone(pipe(pruned, Context.getOption(C)))
    assertSome(pipe(env, Context.getOption(C)), { c: 2 })
  })

  it("omits services from env", () => {
    const env = pipe(
      Context.empty(),
      Context.add(A, { a: 0 }),
      Context.merge(pipe(
        Context.empty(),
        Context.add(B, { b: 1 }),
        Context.add(C, { c: 2 })
      ))
    )

    const pruned = pipe(
      env,
      Context.omit(A, B)
    )

    assertNone(pipe(pruned, Context.getOption(A)))
    deepStrictEqual(pipe(env, Context.get(C)), { c: 2 })
  })

  it("applies a patch to the environment", () => {
    const a: A = { a: 0 }
    const b: B = { b: 1 }
    const c: C = { c: 2 }
    const oldEnv = pipe(
      Context.empty(),
      Context.add(A, a),
      Context.add(B, b),
      Context.add(C, c)
    ) as Context.Context<A | B | C>
    const newEnv = pipe(
      Context.empty(),
      Context.add(A, a),
      Context.add(B, { b: 3 })
    ) as Context.Context<A | B | C>
    const differ = Differ.environment<A | B | C>()
    const patch = differ.diff(oldEnv, newEnv)
    const result = differ.patch(patch, oldEnv)

    assertTrue(Option.isSome(Context.getOption(A)(result)))
    assertTrue(Option.isSome(Context.getOption(B)(result)))
    assertTrue(Option.isNone(Context.getOption(C)(result)))
    strictEqual(pipe(result, Context.get(B)).b, 3)
  })

  it("creates a proper diff", () => {
    const a: A = { a: 0 }
    const b: B = { b: 1 }
    const c: C = { c: 2 }
    const oldEnv = pipe(
      Context.empty(),
      Context.add(A, a),
      Context.add(B, b),
      Context.add(C, c)
    ) as Context.Context<A | B | C>
    const newEnv = pipe(
      Context.empty(),
      Context.add(A, a),
      Context.add(B, { b: 3 })
    ) as Context.Context<A | B | C>
    const differ = Differ.environment<A | B | C>()
    const result: any = differ.diff(oldEnv, newEnv)

    strictEqual(result.first._tag, "AndThen")
    strictEqual(result.first.first._tag, "Empty")
    strictEqual(result.first.second._tag, "UpdateService")
    strictEqual(result.first.second.key, B.key)
    strictEqual(result.second._tag, "RemoveService")
    strictEqual(result.second.key, C.key)
  })

  it("pipe()", () => {
    const result = Context.empty().pipe(Context.add(A, { a: 0 }))
    deepStrictEqual(result.pipe(Context.get(A)), { a: 0 })
  })

  it("tag pipe", () => {
    const result = A.pipe((tag) => Context.make(tag, { a: 0 }))
    deepStrictEqual(result.pipe(Context.get(A)), { a: 0 })
  })

  it("mergeAll", () => {
    const env = Context.mergeAll(
      Context.make(A, { a: 0 }),
      Context.make(B, { b: 1 }),
      Context.make(C, { c: 2 })
    )

    const pruned = pipe(
      env,
      Context.pick(A, B)
    )

    deepStrictEqual(pipe(pruned, Context.get(A)), { a: 0 })
    assertSome(pipe(pruned, Context.getOption(B)), { b: 1 })
    assertNone(pipe(pruned, Context.getOption(C)))
    assertSome(pipe(env, Context.getOption(C)), { c: 2 })
  })

  it("isContext", () => {
    assertTrue(Context.isContext(Context.empty()))
    assertFalse(Context.isContext(null))
  })

  it("isTag", () => {
    assertTrue(Context.isTag(Context.GenericTag("Demo")))
    assertFalse(Context.isContext(null))
  })

  it("isReference", () => {
    assertTrue(Context.isTag(E))
    assertTrue(Context.isReference(E))
  })
})
