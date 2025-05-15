/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ManagedRuntime } from "effect"
import { describe, expect, it } from "tstyche"

declare const runtime: ManagedRuntime.ManagedRuntime<"context", "error">

describe("ManagedRuntime", () => {
  it("ManagedRuntime.Context type helper", () => {
    expect<ManagedRuntime.ManagedRuntime.Context<typeof runtime>>().type.toBe<"context">()
  })

  it("ManagedRuntime.Error type helper", () => {
    expect<ManagedRuntime.ManagedRuntime.Error<typeof runtime>>().type.toBe<"error">()
  })
})
