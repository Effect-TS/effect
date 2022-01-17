import * as HM from "../src/Collections/Immutable/HashMap"
import * as HS from "../src/Collections/Immutable/HashSet"
import * as Structural from "../src/Structural"
import * as H from "../src/Structural/HasHash"
import { WeakConcurrentBag } from "../src/Support/WeakConcurrentBag"
import type { WeakReference } from "../src/Support/WeakReference"

class Wrapper<A> implements H.HasHash {
  constructor(readonly value: A) {}

  get [Structural.hashSym]() {
    return H.hash(this.value)
  }
}

describe("WeakConcurrentBag", () => {
  test("size of singleton bag", () => {
    const bag = new WeakConcurrentBag<Wrapper<string>>(10)

    const value = new Wrapper("foo")

    bag.add(value)

    expect(bag.size).toEqual(1)
  })

  test("iteration over 100 (buckets: 100)", () => {
    const bag = new WeakConcurrentBag<Wrapper<string>>(100)

    const hard = HS.beginMutation(HS.make<Wrapper<string>>())

    for (let i = 0; i < 100; i++) {
      const str = new Wrapper(i.toString())
      HS.add_(hard, str)
      bag.add(str)
    }

    expect(bag.size).toEqual(100)

    console.log(Array.from(HS.from(bag)))

    console.log(Array.from(hard))

    expect(Structural.equals(HS.from(bag), hard)).toBeTruthy()
  })

  test("manual gc", () => {
    const bag = new WeakConcurrentBag<Wrapper<string>>(100)

    const hard = HM.beginMutation(HM.make<number, WeakReference<Wrapper<string>>>())

    for (let i = 0; i < 100; i++) {
      const str = new Wrapper(i.toString())

      const ref = bag.add(str)

      HM.set_(hard, i, ref)
    }

    for (let i = 0; i < 50; i++) {
      HM.unsafeGet_(hard, i * 2).clear()
    }

    bag.gc()

    expect(bag.size).toEqual(50)
  })

  // TODO: The following test is flaky, leaving it commented out for now
  /*
   *   test("auto gc", () => {
   *     const bag = new WeakConcurrentBag<Wrapper<string>>(100)
   *
   *     for (let i = 0; i < 10000; i++) {
   *       const str = new Wrapper(Math.random().toString())
   *
   *       const ref = bag.add(str)
   *
   *       ref.clear()
   *     }
   *
   *     expect(bag.size).toBeLessThan(100)
   *   })
   */
})
