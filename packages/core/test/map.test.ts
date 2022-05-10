import * as AR from "../src/Collections/Immutable/Array/index.js"
import * as MAP from "../src/Collections/Immutable/Map/index.js"

describe(`Map`, () => {
  describe(`getIdentity`, () => {
    test(`A Map empty returns B map untouched`, () => {
      const A = MAP.empty
      const B = MAP.make([["B_prop", ["B_prop_value"]]])

      const identity = MAP.getIdentity(AR.getIdentity<string>())

      expect(identity.combine(A, B)).toBe(B)
    })

    test(`B Map empty returns A map untouched`, () => {
      const A = MAP.make([["A_prop", ["A_prop_value"]]])
      const B = MAP.empty

      const identity = MAP.getIdentity(AR.getIdentity<string>())

      expect(identity.combine(A, B)).toBe(A)
    })

    test(`Adds prop from A & B maps`, () => {
      const A = MAP.make([["A_prop", ["A_prop_value"]]])
      const B = MAP.make([["B_prop", ["B_prop_value"]]])

      const identity = MAP.getIdentity(AR.getIdentity<string>())

      expect(identity.combine(A, B)).toStrictEqual(
        MAP.make([
          ["A_prop", ["A_prop_value"]],
          ["B_prop", ["B_prop_value"]]
        ])
      )
    })

    test(`Merges shared prop values`, () => {
      const A = MAP.make([["shared_prop", ["value_from_map_A"]]])
      const B = MAP.make([["shared_prop", ["value_from_map_B"]]])

      const identity = MAP.getIdentity(AR.getIdentity<string>())

      expect(identity.combine(A, B)).toStrictEqual(
        MAP.make([["shared_prop", ["value_from_map_A", "value_from_map_B"]]])
      )
    })
  })
})
