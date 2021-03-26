import * as Eq from "@effect-ts/core/Equal"
import * as fc from "fast-check"

import * as D from "../src/Core/Doc"
import * as O from "../src/Core/Optimize"
import * as R from "../src/Core/Render"
import { arbDoc } from "./test-utils"

const arbFusionDepth: fc.Arbitrary<O.FusionDepth> = fc.oneof(
  fc.constant(O.Shallow),
  fc.constant(O.Deep)
)

describe("Optimize", () => {
  it("should optimize fused documents", () => {
    const unfused = D.hcatT(D.char("a"), D.char("b"), D.char("c"), D.char("d"))
    const fused = O.optimize(unfused)(O.Deep)

    // Unfused document will have individual documents for each character
    expect(unfused).toHaveProperty(["left", "left", "left", "char"], "a")
    expect(unfused).toHaveProperty(["left", "left", "right", "char"], "b")
    expect(unfused).toHaveProperty(["left", "right", "char"], "c")
    expect(unfused).toHaveProperty(["right", "char"], "d")

    // Fused document will result in a single `Cat` document with two branches
    // containing the concatenated characters in each branch of the previous
    // unfused document
    expect(fused).toHaveProperty("text", "abcd")
  })

  it("should render fused and unfused documents identically", () => {
    fc.assert(
      fc.property(arbDoc, arbFusionDepth, (doc, depth) => {
        const fused = R.renderPrettyDefault(O.optimize(doc)(depth))
        const unfused = R.renderPrettyDefault(doc)
        return Eq.string.equals(fused, unfused)
      })
    )
  })
})
