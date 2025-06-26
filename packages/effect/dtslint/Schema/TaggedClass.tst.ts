import { Schema } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schema.TaggedClass", () => {
  it("Annotations as tuple", () => {
    // @ts-expect-error!
    class _A extends Schema.TaggedClass<_A>()("A", { id: Schema.Number }, [
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
