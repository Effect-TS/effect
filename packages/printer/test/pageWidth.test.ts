import * as PageWidth from "@effect/printer/PageWidth"
import { describe, expect, it } from "@effect/vitest"

describe.concurrent("PageWidth", () => {
  it("remainingWidth", () => {
    expect(PageWidth.remainingWidth(80, 1, 4, 40)).toBe(40)
  })
})
