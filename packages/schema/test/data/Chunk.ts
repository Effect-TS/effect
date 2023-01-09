import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as _ from "@fp-ts/schema/data/Chunk"
import { parseNumber } from "@fp-ts/schema/data/parser"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const NumberFromString = pipe(S.string, parseNumber)

describe.concurrent("Chunk", () => {
  it("chunk. keyof", () => {
    expect(S.keyof(_.chunk(S.string))).toEqual(S.union(S.literal("_id"), S.literal("length")))
  })

  it("chunk. property tests", () => {
    Util.property(_.chunk(S.number))
  })

  it("chunk. decoder", () => {
    const schema = _.chunk(NumberFromString)
    Util.expectDecodingSuccess(schema, C.empty(), C.empty())
    Util.expectDecodingSuccess(schema, C.fromIterable(["1", "2", "3"]), C.fromIterable([1, 2, 3]))

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(Chunk<unknown>)`)
    Util.expectDecodingFailure(
      schema,
      C.fromIterable(["1", "a", "3"]),
      `/1 "a" did not satisfy parsing from (string) to (number)`
    )
  })

  it("chunk. encoder", () => {
    const schema = _.chunk(NumberFromString)
    Util.expectEncodingSuccess(schema, C.empty(), C.empty())
    Util.expectEncodingSuccess(schema, C.fromIterable([1, 2, 3]), C.fromIterable(["1", "2", "3"]))
  })

  it("chunk. guard", () => {
    const schema = _.chunk(S.string)
    const is = G.is(schema)
    expect(is(C.empty())).toEqual(true)
    expect(is(C.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(is(C.fromIterable(["a", "b", 1]))).toEqual(false)
    expect(is({ _id: Symbol.for("@fp-ts/schema/test/FakeChunk") })).toEqual(false)
  })

  it("chunk. pretty", () => {
    const schema = _.chunk(S.string)
    const pretty = P.pretty(schema)
    expect(pretty(C.empty())).toEqual("Chunk()")
    expect(pretty(C.fromIterable(["a", "b"]))).toEqual(
      "Chunk(\"a\", \"b\")"
    )
  })

  it("fromValues. property tests", () => {
    Util.property(_.fromValues(S.number))
  })

  it("fromValues. decoder", () => {
    const schema = _.fromValues(S.number)
    Util.expectDecodingSuccess(schema, [], C.empty())
    Util.expectDecodingSuccess(schema, [1, 2, 3], C.fromIterable([1, 2, 3]))

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(schema, [1, "a"], `/1 "a" did not satisfy is(number)`)
  })

  it("fromValues. encoder", () => {
    const schema = _.fromValues(S.number)
    Util.expectEncodingSuccess(schema, C.empty(), [])
    Util.expectEncodingSuccess(schema, C.fromIterable([1, 2, 3]), [1, 2, 3])
  })
})
