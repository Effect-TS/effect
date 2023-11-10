import * as Context from "effect/Context"
import * as Differ from "effect/Differ"
import { pipe } from "effect/Function"
import * as O from "effect/Option"
import { assert, describe, expect, it } from "vitest"

interface A {
  a: number
}
const A = Context.Tag<A>()

interface B {
  b: number
}
const B = Context.Tag<B>()

interface C {
  c: number
}
const C = Context.Tag<C>("C")

describe.concurrent("Context", () => {
  it("Tag.toJson()", () => {
    const json: any = A.toJSON()
    expect(json["_id"]).toEqual("Tag")
    expect(json["identifier"]).toEqual(undefined)
    expect(typeof json["stack"]).toEqual("string")
  })

  it("Context.toJson()", () => {
    const json: any = Context.empty().toJSON()
    expect(json["_id"]).toEqual("Context")
    expect(json["services"]).toEqual([])
  })

  it("global tag", () => {
    const a = Context.Tag<number>("effect-test/Context/Tag")
    const b = Context.Tag<number>("effect-test/Context/Tag")
    expect(a).toBe(b)
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
    const Service = Context.Tag<FooBar, Foo | Bar>()
    const context = Context.make(Service, { _tag: "Foo" })
    expect(Context.get(context, Service)).toStrictEqual({ _tag: "Foo" })
  })

  it("adds and retrieve services", () => {
    const Services = pipe(
      Context.make(A, { a: 0 }),
      Context.add(B, { b: 1 })
    )

    expect(Context.get(Services, A)).toEqual({ a: 0 })

    expect(pipe(
      Services,
      Context.getOption(B)
    )).toEqual(O.some({ b: 1 }))

    expect(pipe(
      Services,
      Context.getOption(C)
    )).toEqual(O.none())

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
    assert.deepNestedPropertyVal(result, "first.second.tag", B)
    assert.deepNestedPropertyVal(result, "second._tag", "RemoveService")
    assert.deepNestedPropertyVal(result, "second.tag", C)
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
          new RegExp(/Error: Service not found: C \(defined at (.*)Context.ts:20:19\)/)
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
    expect(Context.isTag(Context.Tag())).toEqual(true)
    expect(Context.isContext(null)).toEqual(false)
  })
})
