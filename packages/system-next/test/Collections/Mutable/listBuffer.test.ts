import { IndexOutOfBoundsException } from "../../..//src/GlobalExceptions"
import * as L from "../../../src/Collections/Immutable/LinkedList"
import { ListBuffer } from "../../../src/Collections/Mutable/ListBuffer"

describe("ListBuffer", () => {
  describe("empty", () => {
    it("returns a new empty ListBuffer", () => {
      expect(ListBuffer.empty()).toEqual(new ListBuffer())
    })
  })

  describe("from", () => {
    it("returns a new ListBuffer from an Iterable", () => {
      const buf = ListBuffer.empty()
      buf.append(0).append(1).append(2)
      expect(ListBuffer.from([0, 1, 2])).toEqual(buf)
    })
  })

  describe("append", () => {
    it("mutably appends elements to a ListBuffer", () => {
      const buf = new ListBuffer<number>()
      buf.append(0).append(1).append(2)
      expect(buf.toList).toEqual(L.from([0, 1, 2]))
    })
  })

  describe("prepend", () => {
    it("mutably prepends elements to a ListBuffer", () => {
      const buf = ListBuffer.empty<number>()
      buf.prepend(0).prepend(1).prepend(2)
      expect(buf.toList).toEqual(L.from([2, 1, 0]))
    })
  })

  describe("length", () => {
    it("returns the number of elements contained in the ListBuffer", () => {
      const buf = new ListBuffer<number>()
      for (let i = 0; i < 10; i++) {
        buf.append(i)
      }
      expect(buf.length).toEqual(10)
    })
  })

  describe("unsafeHead", () => {
    it("returns the first element in the ListBuffer", () => {
      const buf = ListBuffer.from([0, 1, 2])
      expect(buf.unsafeHead).toEqual(0)
    })
    it("returns undefined if the ListBuffer is empty", () => {
      expect(ListBuffer.empty().unsafeHead).toEqual(undefined)
    })
  })

  describe("unsafeTail", () => {
    it("returns a LinkedList with the first element excluded", () => {
      const buf = ListBuffer.from([0, 1, 2])
      expect(buf.unsafeTail).toEqual(L.from([1, 2]))
    })
    it("returns undefined if the ListBuffer is empty", () => {
      expect(ListBuffer.empty().unsafeTail).toEqual(undefined)
    })
  })

  describe("insert", () => {
    it("inserts an element at the given index", () => {
      const buf = ListBuffer.from([1, 2, 3])
      buf.insert(1, 2)
      expect(buf).toEqual(ListBuffer.from([1, 2, 2, 3]))
    })
    it("throws an exception if the index is out of bounds", () => {
      try {
        ListBuffer.empty().insert(1, 1)
        fail()
      } catch (e) {
        expect(e).toBeInstanceOf(IndexOutOfBoundsException)
      }
    })
  })

  describe("reduce", () => {
    it("accumulates a value over a ListBuffer", () => {
      expect(
        ListBuffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).reduce(0, (b, a) => b + a)
      ).toEqual(45)
    })
    it("returns the initial value if the ListBuffer is empty", () => {
      expect(ListBuffer.empty<number>().reduce(0, (b, a) => b + a)).toEqual(0)
    })
  })
})
