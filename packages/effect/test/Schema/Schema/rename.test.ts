import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("rename", () => {
  describe("Struct", () => {
    it("from string key to string key", async () => {
      const schema = S.Struct({ a: S.String, b: S.Number })
      const renamed = S.rename(schema, { a: "c" })

      await Util.assertions.decoding.succeed(renamed, { a: "a", b: 1 }, { c: "a", b: 1 })
      await Util.assertions.encoding.succeed(renamed, { c: "a", b: 1 }, { a: "a", b: 1 })
    })

    it("from string key to symbol key", async () => {
      const c = Symbol.for("effect/Schema/test/c")
      const schema = S.Struct({ a: S.String, b: S.Number })
      const renamed = S.rename(schema, { a: c })

      await Util.assertions.decoding.succeed(renamed, { a: "a", b: 1 }, { [c]: "a", b: 1 })
      await Util.assertions.encoding.succeed(renamed, { [c]: "a", b: 1 }, { a: "a", b: 1 })
    })

    it("from symbol key to string key", async () => {
      const a = Symbol.for("effect/Schema/test/a")
      const schema = S.Struct({ [a]: S.String, b: S.Number })
      const renamed = S.rename(schema, { [a]: "c" })

      await Util.assertions.decoding.succeed(renamed, { [a]: "a", b: 1 }, { c: "a", b: 1 })
      await Util.assertions.encoding.succeed(renamed, { c: "a", b: 1 }, { [a]: "a", b: 1 })
    })

    it("from symbol key to symbol key", async () => {
      const a = Symbol.for("effect/Schema/test/a")
      const c = Symbol.for("effect/Schema/test/c")
      const schema = S.Struct({ [a]: S.String, b: S.Number })
      const renamed = S.rename(schema, { [a]: c })

      await Util.assertions.decoding.succeed(renamed, { [a]: "a", b: 1 }, { [c]: "a", b: 1 })
      await Util.assertions.encoding.succeed(renamed, { [c]: "a", b: 1 }, { [a]: "a", b: 1 })
    })
  })

  it("Transform (renaming twice)", async () => {
    const schema = S.Struct({ a: S.String, b: S.Number })
    const renamed = S.rename(schema, { a: "c" })
    const renamed2 = S.rename(renamed, { c: "d" })

    await Util.assertions.decoding.succeed(renamed2, { a: "a", b: 1 }, { d: "a", b: 1 })
    await Util.assertions.encoding.succeed(renamed2, { d: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("suspend", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () =>
        S.Struct({
          a: S.String,
          as: S.Array(schema)
        })
    )
    const renamed = S.rename(schema, { a: "c" })

    await Util.assertions.decoding.succeed(renamed, { a: "a1", as: [{ a: "a2", as: [] }] }, {
      c: "a1",
      as: [{ a: "a2", as: [] }]
    })
    await Util.assertions.encoding.succeed(renamed, {
      c: "a1",
      as: [{ a: "a2", as: [] }]
    }, { a: "a1", as: [{ a: "a2", as: [] }] })
  })

  it("pipe", async () => {
    const renamed = S.Struct({ a: S.String, b: S.Number }).pipe(
      S.rename({ a: "c" })
    )

    await Util.assertions.decoding.succeed(renamed, { a: "a", b: 1 }, { c: "a", b: 1 })
    await Util.assertions.encoding.succeed(renamed, { c: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("should return the same ast if there are no mappings", () => {
    const schema = S.Struct({ a: S.String })
    const renamed = S.rename(schema, {})
    strictEqual(schema.ast, renamed.ast)
  })

  it("field transformation", async () => {
    const schema = S.Struct({ a: S.String, b: S.NumberFromString })
    const renamed = S.rename(schema, { a: "c" })

    await Util.assertions.decoding.succeed(renamed, { a: "a", b: "1" }, { c: "a", b: 1 })
    await Util.assertions.encoding.succeed(renamed, { c: "a", b: 1 }, { a: "a", b: "1" })
  })

  it("union", async () => {
    const A = S.Struct({
      ab: S.Number
    })

    const B = S.Struct({
      ab: S.Null
    })

    const schema = S.Union(
      A.pipe(S.attachPropertySignature("kind", "A")),
      B.pipe(S.attachPropertySignature("kind", "B"))
    )
    const renamed = schema.pipe(S.rename({ ab: "c" }))
    await Util.assertions.decoding.succeed(renamed, { ab: 1 }, { kind: "A", c: 1 })
    await Util.assertions.decoding.succeed(renamed, { ab: null }, { kind: "B", c: null })

    await Util.assertions.encoding.succeed(renamed, { kind: "A", c: 1 }, { ab: 1 })
    await Util.assertions.encoding.succeed(renamed, { kind: "B", c: null }, { ab: null })
  })
})
