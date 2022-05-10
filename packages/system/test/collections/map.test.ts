import * as M from "../../src/Collections/Immutable/Map"
import * as EQ from "../../src/Equal"
import * as OP from "../../src/Option"

describe(`Map`, () => {
  describe(`lookupEq`, () => {
    test(`No match returns None`, () => {
      const mapWithNoMatchForLookedUpKey = M.make([["A", "key_A_value"]])
      const result = M.lookupEq_(EQ.string, mapWithNoMatchForLookedUpKey, "B")

      expect(result).toEqual(OP.none)
    })

    test(`Match returns value`, () => {
      const lookedUpKeyName = "A"
      const lookedUpKeyValue = "A_value"
      const mapWithAMatchForLookedUpKey = M.make([[lookedUpKeyName, lookedUpKeyValue]])

      const result = M.lookupEq_(
        EQ.string,
        mapWithAMatchForLookedUpKey,
        lookedUpKeyName
      )

      expect(result).toEqual(OP.some(lookedUpKeyValue))
    })
  })

  describe(`removeEq`, () => {
    test(`No key matching does nothing`, () => {
      const mapWithNoMatchForDeletedKey = M.make([["A", "key_A_value"]])

      const result = M.removeEq_(EQ.string, mapWithNoMatchForDeletedKey, "B")

      expect(mapWithNoMatchForDeletedKey).toEqual(result)
    })

    test(`Matching key returns new map without deleted key`, () => {
      const mapWithAMatchForDeletedKey = M.make([["A", "key_A_value"]])

      const result = M.removeEq_(EQ.string, mapWithAMatchForDeletedKey, "A")

      expect(result).toEqual(M.empty)
    })
  })
})
