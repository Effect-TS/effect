import { arbDoc } from "@effect/printer/test/test-utils"
import * as fc from "fast-check"

const arbFusionDepth: fc.Arbitrary<Optimize.Depth> = fc.oneof(
  fc.constant(Optimize.Depth.Shallow),
  fc.constant(Optimize.Depth.Deep)
)

describe("Optimize", () => {
  it("should optimize fused documents", () => {
    const unfused = Doc.hcat([Doc.char("a"), Doc.char("b"), Doc.char("c"), Doc.char("d")])
    const fused = unfused.optimize(Optimize.Depth.Deep)

    // Unfused document will have individual documents for each character
    assert.deepNestedPropertyVal(unfused, "left.left.left.char", "a")
    assert.deepNestedPropertyVal(unfused, "left.left.right.char", "b")
    assert.deepNestedPropertyVal(unfused, "left.right.char", "c")
    assert.deepNestedPropertyVal(unfused, "right.char", "d")

    // Fused document will have be a single text document combining each
    // individual char document together
    assert.propertyVal(fused, "text", "abcd")
  })

  it("should render fused and unfused documents identically", () => {
    fc.assert(
      fc.property(arbDoc, arbFusionDepth, (doc, depth) => {
        const fused: string = doc.optimize(depth).prettyDefault
        const unfused: string = doc.prettyDefault
        return fused === unfused
      })
    )
  })
})
