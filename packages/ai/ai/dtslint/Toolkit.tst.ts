import * as Tool from "@effect/ai/Tool"
import type * as Toolkit from "@effect/ai/Toolkit"
import { Schema } from "effect"
import { describe, expect, it } from "tstyche"

const _Transform = Tool.make("Transform", {
  parameters: { count: Schema.NumberFromString }
})

declare const toolkit: Toolkit.WithHandler<{ readonly Transform: typeof _Transform }>

describe("Toolkit", () => {
  it("handle accepts encoded parameters", () => {
    expect(toolkit.handle).type.toBeCallableWith("Transform", { count: "42" })
    expect(toolkit.handle).type.not.toBeCallableWith("Transform", { count: 42 })
  })
})
