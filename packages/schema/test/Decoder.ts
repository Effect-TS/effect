import { pipe } from "@fp-ts/data/Function"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("Decoder", () => {
  describe("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const decoder = D.decoderFor(schema)
      expect(decoder.decode({ a: 1 })).toEqual(D.success({ a: 1 }))
      expect(decoder.decode({ a: undefined })).toEqual(D.success({ a: undefined }))
      expect(decoder.decode({})).toEqual(D.success({}))
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const decoder = D.decoderFor(schema)
      expect(decoder.decode([])).toEqual(D.success([]))
      expect(decoder.decode(["a"])).toEqual(D.success(["a"]))
      expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const decoder = D.decoderFor(schema)
      expect(decoder.decode([])).toEqual(D.success([]))
      expect(decoder.decode([1])).toEqual(D.success([1]))
      expect(decoder.decode([undefined])).toEqual(D.success([undefined]))

      Util.expectFailure(
        decoder,
        ["a"],
        "/0 member 0 \"a\" did not satisfy isEqual(undefined), member 1 \"a\" did not satisfy is(number)"
      )
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      const decoder = D.decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.success("a"))
      expect(decoder.decode([])).toEqual(D.success([]))
      expect(decoder.decode([1])).toEqual(D.success([1]))
      expect(decoder.decode([undefined])).toEqual(D.success([undefined]))

      Util.expectFailure(
        decoder,
        ["a"],
        "member 0 [\"a\"] did not satisfy is(string), member 1 /0 member 0 \"a\" did not satisfy isEqual(undefined), member 1 \"a\" did not satisfy is(number)"
      )
    })
  })
})
