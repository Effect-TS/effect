import * as Doc from "@effect/printer/Doc"
import * as Optimize from "@effect/printer/Optimize"
import { arbDoc } from "@effect/printer/test/utils/DocArbitrary"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const arbFusionDepth: fc.Arbitrary<Optimize.Optimize.Depth> = fc.oneof(
  fc.constant(Optimize.Shallow),
  fc.constant(Optimize.Deep)
)

describe("Optimize", () => {
  it("should optimize fused documents", () => {
    const unfused = Doc.hcat([Doc.char("a"), Doc.char("b"), Doc.char("c"), Doc.char("d")])
    const fused = Optimize.optimize(unfused, Optimize.Deep)
    // Unfused document will have individual documents for each character
    expect(unfused).toHaveProperty("left.char", "a")
    expect(unfused).toHaveProperty("right.left.char", "b")
    expect(unfused).toHaveProperty("right.right.left.char", "c")
    expect(unfused).toHaveProperty("right.right.right.char", "d")
    // Fused document will have be a single text document combining each
    // individual char document together
    expect(fused).toHaveProperty("text", "abcd")
  })

  it("should render fused and unfused documents identically", () => {
    fc.assert(
      fc.property(arbDoc, arbFusionDepth, (doc, depth) => {
        const fused: string = Doc.render(Optimize.optimize(doc, depth), { style: "pretty" })
        const unfused: string = Doc.render(doc, { style: "pretty" })
        return fused === unfused
      })
    )
  })
})
