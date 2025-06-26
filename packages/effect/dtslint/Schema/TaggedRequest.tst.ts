import { Schema } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schema.TaggedRequest", () => {
  it("should expose fields, _tag, success and failure", () => {
    class A extends Schema.TaggedRequest<A>()("A", {
      failure: Schema.String,
      success: Schema.Number,
      payload: {
        id: Schema.Number
      }
    }) {}

    expect(A.fields)
      .type.toBe<{ readonly _tag: Schema.tag<"A">; readonly id: typeof Schema.Number }>()

    expect(A._tag)
      .type.toBe<"A">()

    expect(A.success)
      .type.toBe<typeof Schema.Number>()

    expect(A.failure)
      .type.toBe<typeof Schema.String>()
  })

  it("Annotations as tuple", () => {
    // @ts-expect-error!
    class _A extends Schema.TaggedRequest<_A>()("A", {
      failure: Schema.String,
      success: Schema.Number,
      payload: {
        id: Schema.Number
      }
    }, [
      undefined,
      undefined,
      {
        pretty: () => (x) => {
          expect(x).type.toBe<{ readonly _tag: "A"; readonly id: number }>()
          return ""
        }
      }
    ]) {}
  })
})
