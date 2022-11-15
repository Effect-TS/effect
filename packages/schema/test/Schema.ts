import { unsafeGuardFor } from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"

describe("Schema", () => {
  it("make", () => {
    expect(S.make).exist
  })

  describe("keyof", () => {
    it("struct", () => {
      const schema = S.struct({
        a: S.string,
        b: S.number
      })
      const keyOf = S.keyof(schema)
      const guard = unsafeGuardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(true)
      expect(guard.is("c")).toEqual(false)
    })

    it("union", () => {
      const schema = S.union(
        S.struct({
          a: S.string,
          b: S.number
        }),
        S.struct({
          a: S.boolean,
          c: S.number
        })
      )
      const keyOf = S.keyof(schema)
      const guard = unsafeGuardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(false)
      expect(guard.is("c")).toEqual(false)
    })
  })
})
