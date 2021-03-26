import { identity } from "@effect-ts/core/Function"

import * as F from "../src/Core/Flatten"

describe("Flatten", () => {
  describe("constructors", () => {
    it("flattened", () => {
      expect(F.flattened(1)).toMatchObject({ _tag: "Flattened", value: 1 })
    })

    it("alreadyFlat", () => {
      expect(F.alreadyFlat).toMatchObject({ _tag: "AlreadyFlat" })
    })

    it("neverFlat", () => {
      expect(F.neverFlat).toMatchObject({ _tag: "NeverFlat" })
    })
  })

  describe("destructors", () => {
    it("match", () => {
      const match = F.match({
        Flattened: () => "Flattened",
        AlreadyFlat: () => "AlreadyFlat",
        NeverFlat: () => "NeverFlat"
      })

      expect(match(F.flattened(1))).toBe("Flattened")
      expect(match(F.alreadyFlat)).toBe("AlreadyFlat")
      expect(match(F.neverFlat)).toBe("NeverFlat")
    })
  })

  describe("operations", () => {
    it("isFlattened", () => {
      expect(F.isFlattened(F.flattened(1))).toBeTruthy()
      expect(F.isFlattened(F.neverFlat)).toBeFalsy()
    })

    it("isAlreadyFlat", () => {
      expect(F.isAlreadyFlat(F.alreadyFlat)).toBeTruthy()
      expect(F.isAlreadyFlat(F.neverFlat)).toBeFalsy()
    })

    it("isNeverFlat", () => {
      expect(F.isNeverFlat(F.neverFlat)).toBeTruthy()
      expect(F.isNeverFlat(F.alreadyFlat)).toBeFalsy()
    })

    it("map", () => {
      expect(F.map_(F.flattened(1), (n) => n + 1)).toMatchObject(F.flattened(2))
      expect(F.map_(F.alreadyFlat, identity)).toMatchObject(F.alreadyFlat)
      expect(F.map_(F.neverFlat, identity)).toMatchObject(F.neverFlat)
    })
  })
})
