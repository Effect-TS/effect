import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

function objectToFormData(obj: Record<string, string | ReadonlyArray<string>>): FormData {
  const fd = new FormData()
  Object.entries(obj).forEach((member) => {
    const [key, value] = member
    if (Array.isArray(value)) {
      value.forEach((v: string) => fd.append(key, v))
    } else {
      value
      fd.append(key, value as string)
    }
  })
  return fd
}

describe("FormDataFromSelf", () => {
  const _schema = S.Struct({
    str: S.String,
    arr: S.Array(S.String)
  })
  const schema = S.FormDataFromSelf(_schema)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("equivalence", () => {
    const isEquivalent = S.equivalence(schema)

    expect(isEquivalent(
      objectToFormData({ str: "str" }),
      objectToFormData({ str: "str" })
    )).toBe(true)
    expect(isEquivalent(
      objectToFormData({ str: "str" }),
      objectToFormData({ str: "x" })
    )).toBe(false)
    expect(isEquivalent(
      objectToFormData({ str: "str", arr: [] }),
      objectToFormData({ str: "str" })
    )).toBe(true)
    expect(isEquivalent(
      objectToFormData({ str: "str", arr: ["2"] }),
      objectToFormData({ str: "str" })
    )).toBe(false)
  })

  it("arbitrary", () => {
    Util.expectArbitrary(
      S.FormDataFromSelf(S.Struct({
        str: S.String,
        arr: S.Array(S.String)
      }))
    )
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      objectToFormData({ str: "prop1" }),
      objectToFormData({ str: "prop1" })
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      objectToFormData({ str: "prop1" }),
      objectToFormData({ str: "prop1", arr: [] })
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      objectToFormData({}),
      `FormData<{ readonly str: string; readonly arr: ReadonlyArray<string> }>
└─ { readonly str: string; readonly arr: ReadonlyArray<string> }
   └─ ["str"]
      └─ is missing`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      objectToFormData({
        str: "str"
      }),
      objectToFormData({
        str: "str"
      })
    )
    await Util.expectEncodeSuccess(
      schema,
      objectToFormData({
        str: "str",
        arr: []
      }),
      objectToFormData({
        str: "str"
      })
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    const fd = objectToFormData({
      str: "str",
      arr: ["arr1", "arr2"],
      prop1: ["el1", "el2"],
      prop2: "prop2"
    })
    expect(pretty(fd)).toEqual(`FormData({ "str": "str", "arr": ["arr1", "arr2"] })`)
  })
})
