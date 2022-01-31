import { List } from "../../../src/collection/immutable/List"
import { Option } from "../../../src/data/Option"

describe("List", () => {
  describe("find", () => {
    it("should return Some for the first value that satisfies the specified predicate", () => {
      const list = List(0, 1, 2, 3, 4)
      const result = list.find((n) => n > 1)

      expect(result).toEqual(Option.some(2))
    })

    it("should return None if no value satisfies the specified predicate", () => {
      const list = List(0, 1, 2, 3, 4)
      const result = list.find((n) => n > 4)

      expect(result).toEqual(Option.none)
    })
  })

  describe("findLast", () => {
    it("should return Some for the last value that satisfies the specified predicate", () => {
      const list = List(0, 1, 2, 3, 4)
      const result = list.findLast((n) => n > 1)

      expect(result).toEqual(Option.some(4))
    })

    it("should return None if no value satisfies the specified predicate", () => {
      const list = List(0, 1, 2, 3, 4)
      const result = list.find((n) => n > 4)

      expect(result).toEqual(Option.none)
    })
  })
})
