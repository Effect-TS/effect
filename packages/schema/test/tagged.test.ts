import * as T from "@effect-ts/core/Effect"

import * as S from "../src"
import * as Constructor from "../src/Constructor"
import * as Encoder from "../src/Encoder"
import * as Parser from "../src/Parser"

const Add_ = S.struct({
  required: {
    _tag: S.tag("Add"),
    x: S.number,
    y: S.number
  }
})
interface Add extends S.ParsedShapeOf<typeof Add_> {}
const Add = S.opaque<Add>()(Add_)

const Mul_ = S.struct({
  required: {
    _tag: S.tag("Mul"),
    x: S.number,
    y: S.number
  }
})
interface Mul extends S.ParsedShapeOf<typeof Mul_> {}
const Mul = S.opaque<Mul>()(Mul_)

const Operation = S.tagged(Add, Mul)

const parseOperation = Parser.for(Operation)["|>"](S.condemnFail)
const constructOperation = Constructor.for(Operation)["|>"](S.condemnFail)
const encodeOperation = Encoder.for(Operation)

describe("Tagged Union", () => {
  it("parse", async () => {
    const result = await T.runPromise(
      T.either(parseOperation({ _tag: "Add", x: 1, y: 2 }))
    )

    expect(result._tag).equals("Right")

    const result_miss_tag = await T.runPromise(
      T.either(parseOperation({ _key: "Add", x: 1, y: 2 }))
    )

    expect(result_miss_tag._tag).equals("Left")

    if (result_miss_tag._tag === "Left") {
      expect(result_miss_tag.left.message).equals(
        'cannot extract tagged key _tag from {"_key":"Add","x":1,"y":2}, expected one of Add, Mul'
      )
    }

    const result_construct = await T.runPromise(
      T.either(
        constructOperation({
          _tag: "Add",
          x: 0,
          y: 1
        })
      )
    )

    expect(result_construct._tag).equals("Right")

    if (result_construct._tag === "Right") {
      expect(encodeOperation(result_construct.right)).toEqual({
        _tag: "Add",
        x: 0,
        y: 1
      })
      expect(
        result_construct.right["|>"](
          Operation.Api.matchS({
            Add: (_) => _._tag,
            Mul: (_) => _._tag
          })
        )
      ).toEqual("Add")
    }
  })
})
