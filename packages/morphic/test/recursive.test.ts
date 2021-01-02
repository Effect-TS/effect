import * as MO from "../src"
import { equal } from "../src/Equal"

export interface MatchField {
  readonly _tag: "MatchField"
  readonly field: string
  readonly value: string
}

export interface HasField {
  readonly _tag: "HasField"
  readonly field: string
}

export interface All {
  readonly _tag: "All"
  readonly conditions: readonly Condition[]
}

export interface Any {
  readonly _tag: "Any"
  readonly conditions: readonly Condition[]
}

export interface None {
  readonly _tag: "None"
  readonly conditions: readonly Condition[]
}

export interface Not {
  readonly _tag: "Not"
  readonly condition: Condition
}

export type Condition = All | Any | None | Not | MatchField | HasField

export const Condition = MO.make((F) =>
  F.recursive<unknown, Condition>((Condition) =>
    F.taggedUnion("_tag", {
      All: F.interface({
        _tag: F.stringLiteral("All"),
        conditions: F.array(Condition)
      }),
      Any: F.interface({
        _tag: F.stringLiteral("Any"),
        conditions: F.array(Condition)
      }),
      None: F.interface({
        _tag: F.stringLiteral("None"),
        conditions: F.array(Condition)
      }),
      Not: F.interface({
        _tag: F.stringLiteral("Not"),
        condition: Condition
      }),
      MatchField: F.interface({
        _tag: F.stringLiteral("MatchField"),
        field: F.string(),
        value: F.string()
      }),
      HasField: F.interface({
        _tag: F.stringLiteral("HasField"),
        field: F.string()
      })
    })
  )
)

const eqCondition = equal(Condition).equals

it("should not blow up", () => {
  expect(
    eqCondition({ _tag: "All", conditions: [] })({ _tag: "All", conditions: [] })
  ).toEqual(true)
})
