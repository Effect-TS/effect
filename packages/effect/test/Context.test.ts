import * as Context from "effect/Context"
import * as Differ from "effect/Differ"
import { pipe } from "effect/Function"
import * as O from "effect/Option"
import { assert, describe, expect, it } from "vitest"

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
  it("Tag.toJson()", () => {
    const json: any = A.toJSON()
    expect(json["_id"]).toEqual("Tag")
    expect(json["key"]).toEqual("A")
    expect(typeof json["stack"]).toEqual("string")
  })

  it("TagClass.toJson()", () => {
    const json: any = D.toJSON()
    expect(json["_id"]).toEqual("Tag")
    expect(json["key"]).toEqual("D")
    expect(typeof json["stack"]).toEqual("string")
  })

  it("Context.toJson()", () => {
    const json: any = Context.empty().toJSON()
    expect(json["_id"]).toEqual("Context")
    expect(json["services"]).toEqual([])
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
    const context = Context.make(Service, { _tag: "Foo" })
    expect(Context.get(context, Service)).toStrictEqual({ _tag: "Foo" })
  })

  it("adds and retrieve services", () => {
    const Services = pipe(
      Context.make(A, { a: 0 }),
      Context.add(B, { b: 1 }),
      Context.add(D, { d: 2 })
    )

    expect(Context.get(Services, A)).toEqual({ a: 0 })

    expect(pipe(
      Services,
      Context.getOption(B)
    )).toEqual(O.some({ b: 1 }))

    expect(pipe(
      Services,
      Context.get(D)
    )).toEqual({ d: 2 })

    expect(pipe(
      Services,
      Context.getOption(C)
    )).toEqual(O.none())

    expect(pipe(
      Services,
      Context.get(E)
    )).toEqual({ e: 0 })

    assert.throw(() => {
      pipe(
        Services,
        Context.unsafeGet(C)
      )
    }, "Service not found: C")
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

    expect(pipe(
      pruned,
      Context.get(A)
    )).toEqual({ a: 0 })

    expect(pipe(
      pruned,
      Context.getOption(B)
    )).toEqual(O.some({ b: 1 }))

    expect(pipe(
      pruned,
      Context.getOption(C)
    )).toEqual(O.none())

    expect(pipe(
      env,
      Context.getOption(C)
    )).toEqual(O.some({ c: 2 }))
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

    expect(pipe(
      pruned,
      Context.getOption(A)
    )).toEqual(O.none())

    expect(pipe(
      env,
      Context.get(C)
    )).toEqual({ c: 2 })
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

    assert.isTrue(O.isSome(Context.getOption(A)(result)))
    assert.isTrue(O.isSome(Context.getOption(B)(result)))
    assert.isTrue(O.isNone(Context.getOption(C)(result)))
    assert.strictEqual(pipe(result, Context.get(B)).b, 3)
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
    const result = differ.diff(oldEnv, newEnv)

    assert.deepNestedPropertyVal(result, "first._tag", "AndThen")
    assert.deepNestedPropertyVal(result, "first.first._tag", "Empty")
    assert.deepNestedPropertyVal(result, "first.second._tag", "UpdateService")
    assert.deepNestedPropertyVal(result, "first.second.key", B.key)
    assert.deepNestedPropertyVal(result, "second._tag", "RemoveService")
    assert.deepNestedPropertyVal(result, "second.key", C.key)
  })

  it("error messages", () => {
    assert.throw(() => {
      Context.unsafeGet(Context.empty(), A)
    }, "Service not found")
    assert.throw(() => {
      Context.get(Context.empty(), A as never)
    }, "Service not found")
    assert.throw(() => {
      Context.unsafeGet(Context.empty(), C)
    }, "Service not found: C")
    assert.throw(() => {
      Context.get(Context.empty(), C as never)
    }, "Service not found: C")
    if (typeof window === "undefined") {
      try {
        Context.get(Context.empty(), C as never)
      } catch (e) {
        assert.match(
          String(e),
          new RegExp(/Error: Service not found: C \(defined at (.*)Context.test.ts:20:19\)/)
        )
      }
      try {
        Context.get(Context.empty(), D as never)
      } catch (e) {
        assert.match(
          String(e),
          new RegExp(/Error: Service not found: D \(defined at (.*)Context.test.ts:22:32\)/)
        )
      }
    }
  })

  it("pipe()", () => {
    const result = Context.empty().pipe(Context.add(A, { a: 0 }))
    expect(result.pipe(Context.get(A))).toEqual({ a: 0 })
  })

  it("tag pipe", () => {
    const result = A.pipe((tag) => Context.make(tag, { a: 0 }))
    expect(result.pipe(Context.get(A))).toEqual({ a: 0 })
  })

  it("isContext", () => {
    expect(Context.isContext(Context.empty())).toEqual(true)
    expect(Context.isContext(null)).toEqual(false)
  })

  it("isTag", () => {
    expect(Context.isTag(Context.GenericTag("Demo"))).toEqual(true)
    expect(Context.isContext(null)).toEqual(false)
  })

  it("isReference", () => {
    expect(Context.isTag(E)).toEqual(true)
    expect(Context.isReference(E)).toEqual(true)
  })
})
