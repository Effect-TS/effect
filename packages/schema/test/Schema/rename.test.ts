import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > rename", () => {
  describe("Struct", () => {
    it("from string key to string key", async () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const renamed = S.rename(schema, { a: "c" })

      await Util.expectParseSuccess(renamed, { a: "a", b: 1 }, { c: "a", b: 1 })
      await Util.expectEncodeSuccess(renamed, { c: "a", b: 1 }, { a: "a", b: 1 })
    })

    it("from string key to symbol key", async () => {
      const c = Symbol.for("@effect/schema/test/c")
      const schema = S.struct({ a: S.string, b: S.number })
      const renamed = S.rename(schema, { a: c })

      await Util.expectParseSuccess(renamed, { a: "a", b: 1 }, { [c]: "a", b: 1 })
      await Util.expectEncodeSuccess(renamed, { [c]: "a", b: 1 }, { a: "a", b: 1 })
    })

    it("from symbol key to string key", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const schema = S.struct({ [a]: S.string, b: S.number })
      const renamed = S.rename(schema, { [a]: "c" })

      await Util.expectParseSuccess(renamed, { [a]: "a", b: 1 }, { c: "a", b: 1 })
      await Util.expectEncodeSuccess(renamed, { c: "a", b: 1 }, { [a]: "a", b: 1 })
    })

    it("from symbol key to symbol key", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const c = Symbol.for("@effect/schema/test/c")
      const schema = S.struct({ [a]: S.string, b: S.number })
      const renamed = S.rename(schema, { [a]: c })

      await Util.expectParseSuccess(renamed, { [a]: "a", b: 1 }, { [c]: "a", b: 1 })
      await Util.expectEncodeSuccess(renamed, { [c]: "a", b: 1 }, { [a]: "a", b: 1 })
    })
  })

  it("Transform (renaming twice)", async () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const renamed = S.rename(schema, { a: "c" })
    const renamed2 = S.rename(renamed, { c: "d" })

    await Util.expectParseSuccess(renamed2, { a: "a", b: 1 }, { d: "a", b: 1 })
    await Util.expectEncodeSuccess(renamed2, { d: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("suspend", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () =>
        S.struct({
          a: S.string,
          as: S.array(schema)
        })
    )
    const renamed = S.rename(schema, { a: "c" })

    await Util.expectParseSuccess(renamed, { a: "a1", as: [{ a: "a2", as: [] }] }, {
      c: "a1",
      as: [{ a: "a2", as: [] }]
    })
    await Util.expectEncodeSuccess(renamed, {
      c: "a1",
      as: [{ a: "a2", as: [] }]
    }, { a: "a1", as: [{ a: "a2", as: [] }] })
  })

  it("pipe", async () => {
    const renamed = S.struct({ a: S.string, b: S.number }).pipe(
      S.rename({ a: "c" })
    )

    await Util.expectParseSuccess(renamed, { a: "a", b: 1 }, { c: "a", b: 1 })
    await Util.expectEncodeSuccess(renamed, { c: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("should return the same ast if there are no mappings", () => {
    const schema = S.struct({ a: S.string })
    const renamed = S.rename(schema, {})
    expect(schema.ast === renamed.ast).toBe(true)
  })

  it("field transformation", async () => {
    const schema = S.struct({ a: S.string, b: S.NumberFromString })
    const renamed = S.rename(schema, { a: "c" })

    await Util.expectParseSuccess(renamed, { a: "a", b: "1" }, { c: "a", b: 1 })
    await Util.expectEncodeSuccess(renamed, { c: "a", b: 1 }, { a: "a", b: "1" })
  })
})
