import { Transferable } from "effect/workers"
import { describe, expect, it } from "tstyche"

describe("Transferable", () => {
  it("collects a DOM transfer list", () => {
    const collector = Transferable.makeCollectorUnsafe()
    expect(collector.readUnsafe()).type.toBeAssignableTo<Array<globalThis.Transferable>>()
  })
})
