import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { Equal, Utils } from "effect"

describe("Equal", () => {
  it("invalid Date", () => {
    const d1 = new Date("invalid")
    const d2 = new Date("invalid")
    assertTrue(Equal.equals(d1, d2))
  })

  it("Date(0) vs invalid Date", () => {
    const epoch = new Date(0)
    const invalid = new Date("invalid")
    assertFalse(Equal.equals(epoch, invalid))
  })

  describe("structuralRegion", () => {
    it("null vs null", () => {
      Utils.structuralRegion(() => {
        assertTrue(Equal.equals(null, null))
      })
    })

    it("null vs object", () => {
      Utils.structuralRegion(() => {
        assertFalse(Equal.equals(null, { a: 1 }))
      })
    })

    it("object vs null", () => {
      Utils.structuralRegion(() => {
        assertFalse(Equal.equals({ a: 1 }, null))
      })
    })

    it("null vs string", () => {
      Utils.structuralRegion(() => {
        assertFalse(Equal.equals(null, "hello"))
      })
    })

    it("null vs array", () => {
      Utils.structuralRegion(() => {
        assertFalse(Equal.equals(null, [1, 2, 3]))
      })
    })

    it("nested object with null values", () => {
      const a = { name: "test", address: { city: "NYC", zip: null } }
      const b = { name: "test", address: { city: "NYC", zip: null } }
      Utils.structuralRegion(() => {
        assertTrue(Equal.equals(a, b))
      })
    })

    it("nested object with null vs non-null", () => {
      const a = { name: "test", value: null }
      const b = { name: "test", value: 42 }
      Utils.structuralRegion(() => {
        assertFalse(Equal.equals(a, b))
      })
    })
  })
})
