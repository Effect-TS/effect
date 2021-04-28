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

const Operation_ = S.tagged(Add, Mul)
interface OperationBrand {
  readonly Operation: unique symbol
}
type Operation = S.ParsedShapeOf<typeof Operation_> & OperationBrand
const Operation = Operation_["|>"](S.brand((u) => u as Operation))

const mul = Operation.Api.of.Mul["|>"](S.unsafe)
const add = Operation.Api.of.Add["|>"](S.unsafe)

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
        'cannot extract key _tag from {"_key":"Add","x":1,"y":2}, expected one of Add, Mul'
      )
    }

    const result_bad_element = await T.runPromise(
      T.either(parseOperation({ _tag: "Add", x: 1, y: "2" }))
    )

    expect(result_bad_element._tag).equals("Left")

    if (result_bad_element._tag === "Left") {
      expect(result_bad_element.left.message).equals(
        "1 error(s) found while processing a union\n" +
          '└─ 1 error(s) found while processing member "Add"\n' +
          "   └─ 1 error(s) found while processing a struct\n" +
          '      └─ 1 error(s) found while processing required key "y"\n' +
          "         └─ 1 error(s) found while processing a refinement\n" +
          '            └─ cannot process "2", expected a number'
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
            Add: (_) => mul({ x: _.x, y: _.y }),
            Mul: (_) => add({ x: _.x, y: _.y })
          })
        )._tag
      ).toEqual("Mul")
    }
  })
})
