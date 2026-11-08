import { PathFilter } from "effect"
import { describe, expect, it } from "tstyche"

describe("PathFilter", () => {
  it("Input accepts a filter, patterns or rules", () => {
    expect(PathFilter.empty).type.toBeAssignableTo<PathFilter.Input>()
    expect([PathFilter.exclude("a"), PathFilter.include("a/b")]).type.toBeAssignableTo<PathFilter.Input>()
    expect(new Set<PathFilter.Rule>()).type.toBeAssignableTo<PathFilter.Input>()
    expect("a").type.toBeAssignableTo<PathFilter.Input>()
    expect(["a", "!b", PathFilter.exclude("c")]).type.toBeAssignableTo<PathFilter.Input>()
    expect(1).type.not.toBeAssignableTo<PathFilter.Input>()
  })

  it("records the decision for unmatched paths", () => {
    expect(PathFilter.empty.default).type.toBe<"include" | "exclude">()
    expect(PathFilter.restrict("a", PathFilter.empty)).type.toBe<PathFilter.PathFilter>()
  })
})
