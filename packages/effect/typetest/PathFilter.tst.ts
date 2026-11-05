import { PathFilter } from "effect"
import { describe, expect, it } from "tstyche"

describe("PathFilter", () => {
  it("Input accepts a filter or rules, but not patterns", () => {
    expect(PathFilter.empty).type.toBeAssignableTo<PathFilter.Input>()
    expect([PathFilter.exclude("a"), PathFilter.include("a/b")]).type.toBeAssignableTo<PathFilter.Input>()
    expect(new Set<PathFilter.Rule>()).type.toBeAssignableTo<PathFilter.Input>()
    expect("a").type.not.toBeAssignableTo<PathFilter.Input>()
    expect(["a"]).type.not.toBeAssignableTo<PathFilter.Input>()
  })
})
