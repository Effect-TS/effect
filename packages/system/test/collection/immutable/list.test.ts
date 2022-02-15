import { List } from "../../../src/collection/immutable/List"
import { Option } from "../../../src/data/Option"

describe("List", () => {
  describe("foldLeft", () => {
    it("should fold over an empty List", () => {
      const list = List<number>()
      const result = list.foldLeft(0, (head, tail) => head + tail.length)

      expect(result).toBe(0)
    })

    it("should fold over a non-empty List", () => {
      const list = List(1, 2, 3)
      const result = list.foldLeft(0, (head, tail) => head + tail.length)

      expect(result).toBe(3)
    })
  })

  describe("foldRight", () => {
    it("should fold over an empty List", () => {
      const list = List<number>()
      const result = list.foldRight(0, (init, last) => init.length + last)

      expect(result).toBe(0)
    })

    it("should fold over a non-empty List", () => {
      const list = List(1, 2, 3)
      const result = list.foldRight(0, (init, last) => init.length + last)

      expect(result).toBe(5)
    })
  })

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
