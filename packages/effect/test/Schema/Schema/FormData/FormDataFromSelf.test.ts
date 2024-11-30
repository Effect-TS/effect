import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

function objectToFormData(obj: Record<string, FormDataEntryValue | ReadonlyArray<FormDataEntryValue>>): FormData {
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

const FileFromSelf = S.instanceOf(File, {
  pretty: () => (f) => `File(${f.name})`
})

describe("FormDataFromSelf", () => {
  const _schema = S.Struct({
    str: S.String,
    arr: S.Array(S.String),
    file: FileFromSelf
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
      objectToFormData({ str: "prop1", file: new File([], "filename.txt") }),
      objectToFormData({ str: "prop1", file: new File([], "filename.txt") })
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      objectToFormData({ str: "prop1", file: new File([], "filename.txt") }),
      objectToFormData({ str: "prop1", file: new File([], "filename.txt"), arr: [] })
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      objectToFormData({}),
      `FormData<{ readonly str: string; readonly arr: ReadonlyArray<string>; readonly file: File }>
└─ { readonly str: string; readonly arr: ReadonlyArray<string>; readonly file: File }
   └─ ["str"]
      └─ is missing`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      objectToFormData({
        str: "str",
        file: new File([], "filename.txt")
      }),
      objectToFormData({
        str: "str",
        file: new File([], "filename.txt")
      })
    )
    await Util.expectEncodeSuccess(
      schema,
      objectToFormData({
        str: "str",
        file: new File([], "filename.txt"),
        arr: []
      }),
      objectToFormData({
        str: "str",
        file: new File([], "filename.txt")
      })
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    const fd = objectToFormData({
      str: "str",
      arr: ["arr1", "arr2"],
      prop1: ["el1", "el2"],
      prop2: "prop2",
      file: new File([], "filename.txt")
    })
    expect(pretty(fd)).toEqual(`FormData({ "str": "str", "arr": ["arr1", "arr2"], "file": File(filename.txt) })`)
  })
})
