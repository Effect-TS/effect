import * as L from "../../../src/Collections/Immutable/LinkedList"
import * as O from "../../../src/Option"
import * as St from "../../../src/Structural"

const numbers = L.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

describe("LinkedList", () => {
  describe("empty", () => {
    it("returns the empty LinkedList", () => {
      const l = L.empty()
      expect(L.length(l)).toEqual(0)
      expect(l).toEqual(L.from([]))
    })
  })

  describe("from", () => {
    it("returns a new LinkedList from an Iterable", () => {
      let l = L.empty<number>()
      l = L.prepend_(l, 2)
      l = L.prepend_(l, 1)
      l = L.prepend_(l, 0)
      expect(L.from([0, 1, 2])).toEqual(l)
    })
  })

  describe("length", () => {
    it("returns the number of elements in the LinkedList", () => {
      let l = L.empty<number>()
      for (let i = 0; i < 10; i++) {
        l = L.prepend_(l, i)
      }
      expect(L.length(l)).toEqual(10)
    })
  })

  describe("equalsWith", () => {
    it("cpompares two lists based on the given equality function", () => {
      const l0 = L.from([{ n: 0 }, { n: 1 }, { n: 2 }])
      const l1 = L.from([{ n: 0 }, { n: 1 }, { n: 2 }])
      const l2 = L.from([{ n: 1 }, { n: 2 }, { n: 3 }])

      const equalsFn = (x: { n: number }, y: { n: number }): boolean => x.n === y.n

      expect(L.equalsWith_(l0, l1, equalsFn)).toEqual(true)
      expect(L.equalsWith_(l1, l2, equalsFn)).toEqual(false)
    })
  })

  describe("prepend", () => {
    it("returns a new LinkedList with an element prepended", () => {
      let l = L.empty<number>()
      for (let i = 0; i < 10; i++) {
        l = L.prepend_(l, i)
      }
      expect(l).toEqual(L.from([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]))
    })
  })

  describe("prependAll", () => {
    it("returns a new LinkedList with another LinkedList prepended", () => {
      const prefix = L.from([4, 3, 2, 1])
      let l = L.empty<number>()
      l = L.prepend_(l, 0)
      l = L.prependAll_(l, prefix)
      expect(St.equals(l, L.from([4, 3, 2, 1, 0]))).toEqual(true)
    })
    it("returns the original LinkedList if one is empty", () => {
      expect(L.prependAll_(numbers, L.empty()) === numbers).toEqual(true)
      expect(L.prependAll_(L.empty(), numbers) === numbers).toEqual(true)
    })
  })

  describe("map", () => {
    it("applies a function to each element of a LinkedList, returning a new LinkedList of the results", () => {
      const l = L.from([1, 2, 3, 4])
      const mapped = L.map_(l, (n) => n * 2)
      expect(mapped).toEqual(L.from([2, 4, 6, 8]))
    })
  })

  describe("sort", () => {
    it("returns a new LinkedList with the elements sorted according to the given compare function", () => {
      const l = L.sortWith_(L.from([9, 4, 6, 2, 7, 3, 5, 1, 8, 0]), (x, y) =>
        x < y ? -1 : x > y ? 1 : 0
      )
      expect(l).toEqual(numbers)
    })
  })

  describe("filter", () => {
    it("returns a new LinkedList filtered with the given predicate", () => {
      const l = L.filter_(numbers, (n) => n % 2 === 0)
      expect(l).toEqual(L.from([0, 2, 4, 6, 8]))
    })
  })

  describe("exists", () => {
    it("returns true if any element satisfies the given predicate", () => {
      expect(L.exists_(numbers, (n) => n === 5)).toEqual(true)
    })
    it("returns false if no element satisfies the given predicate", () => {
      expect(L.exists_(numbers, (n) => n === 100)).toEqual(false)
    })
  })

  describe("find", () => {
    it("returns the first element matching the given predicate", () => {
      expect(L.find_(numbers, (n) => n > 5)).toEqual(O.some(6))
    })
    it("returns None if no element matches the given predicate", () => {
      expect(L.find_(numbers, (n) => n < 0)).toEqual(O.none)
    })
  })

  describe("unsafeHead", () => {
    it("returns the first element of a LinkedList", () => {
      expect(L.unsafeHead(numbers)).toEqual(0)
    })
    it("returns undefined if the LinkedList is empty", () => {
      expect(L.unsafeHead(L.empty())).toEqual(undefined)
    })
  })

  describe("head", () => {
    it("returns the first element of a LinkedList in an Option", () => {
      expect(L.head(numbers)).toEqual(O.some(0))
    })
    it("returns None if the LinkedList is empty", () => {
      expect(L.head(L.empty())).toEqual(O.none)
    })
  })

  describe("unsafeTail", () => {
    it("returns the LinkedList with the first element excluded", () => {
      expect(L.unsafeTail(numbers)).toEqual(L.from([1, 2, 3, 4, 5, 6, 7, 8, 9]))
    })
    it("returns undefined if the LinkedList is empty", () => {
      expect(L.unsafeTail(L.empty())).toEqual(undefined)
    })
  })

  describe("tail", () => {
    it("returns the LinkedList with the first element excluded in an Option", () => {
      expect(L.tail(numbers)).toEqual(O.some(L.from([1, 2, 3, 4, 5, 6, 7, 8, 9])))
    })
    it("returns None if the LinkedList is empty", () => {
      expect(L.tail(L.empty())).toEqual(O.none)
    })
  })

  describe("unsafeLast", () => {
    it("returns the last element in the LinkedList", () => {
      expect(L.unsafeLast(numbers)).toEqual(9)
    })
    it("returns undefined if the list is empty", () => {
      expect(L.unsafeLast(L.empty())).toEqual(undefined)
    })
  })

  describe("last", () => {
    it("returns the last element in the LinkedList in an Option", () => {
      expect(L.last(numbers)).toEqual(O.some(9))
    })
    it("returns None if the list is empty", () => {
      expect(L.last(L.empty())).toEqual(O.none)
    })
  })

  describe("reverse", () => {
    it("returns a new LinkedList with the order of elements reversed", () => {
      expect(L.reverse(numbers)).toEqual(L.from([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]))
    })
  })

  describe("take", () => {
    it("returns a new LinkedList with the given number of elements, taken from the beginning", () => {
      expect(L.take_(numbers, 5)).toEqual(L.from([0, 1, 2, 3, 4]))
    })
    it("returns the original LinkedList if the given number of elements is greater than the length", () => {
      expect(L.take_(numbers, 11) === numbers).toEqual(true)
    })
    it("returns the empty LinkedList if the list is empty", () => {
      expect(L.take_(numbers, 0)).toEqual(L.empty())
    })
  })

  describe("reduce", () => {
    it("accumulates a value over a LinkedList", () => {
      expect(L.reduce_(numbers, 0, (b, a) => b + a)).toEqual(45)
    })
    it("returns the initial value if the list is empty", () => {
      expect(L.reduce_(L.empty<number>(), 0, (b, a) => b + a)).toEqual(0)
    })
  })

  describe("concat", () => {
    it("concatenates two LinkedLists", () => {
      expect(L.concat_(numbers, L.from([10, 11, 12, 13, 14, 15]))).toEqual(
        L.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      )
    })
    it("returns the original LinkedList if the other one is empty", () => {
      expect(L.concat_(numbers, L.empty()) === numbers).toEqual(true)
      expect(L.concat_(L.empty(), numbers) === numbers).toEqual(true)
    })
  })

  describe("forEach", () => {
    it("calls the provided function with each element", () => {
      let acc = 0

      const f = jest.fn((n: number) => {
        acc += n
      })

      L.forEach_(numbers, f)

      expect(f).toHaveBeenCalledTimes(10)
      expect(acc).toEqual(45)
    })
  })

  describe("chain", () => {
    it("concatenates each returned list into the result", () => {
      const l = L.from([0, 1, 2])
      expect(L.chain_(l, (n) => L.from([n, n * 2, n * 3]))).toEqual(
        L.from([0, 0, 0, 1, 2, 3, 2, 4, 6])
      )
    })
  })

  describe("builder", () => {
    it("mutably constructs a LinkedList", () => {
      const b = L.builder<number>()
      b.append(0)
      b.append(1)
      b.append(2)
      expect(b.build()).toEqual(L.from([0, 1, 2]))
    })

    it("returns the empty LinkedList if no element is appended", () => {
      const b = L.builder<number>()
      expect(b.build()).toEqual(L.empty())
    })
  })
})
