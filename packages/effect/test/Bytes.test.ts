import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Array as Arr, Bytes, pipe } from "effect"

const b = (...bytes: Array<number>) => new Uint8Array(bytes)

describe("Bytes", () => {
  it("concat", () => {
    deepStrictEqual(Bytes.concat([]), b())
    deepStrictEqual(Bytes.concat([b(1, 2), b(), b(3)]), b(1, 2, 3))
    deepStrictEqual(Bytes.concat([b(1, 2, 3, 4).subarray(1, 3), b(5)]), b(2, 3, 5))

    const single = b(1, 2)
    const copy = Bytes.concat([single])
    assertFalse(copy === single)
    single[0] = 9
    deepStrictEqual(copy, b(1, 2))
  })

  it("equals", () => {
    assertTrue(Bytes.equals(b(), b()))
    assertTrue(Bytes.equals(b(1, 2), b(1, 2)))
    assertFalse(Bytes.equals(b(1, 2), b(1, 3)))
    assertFalse(Bytes.equals(b(1, 2), b(1)))
    assertTrue(pipe(b(1, 2), Bytes.equals(b(1, 2))))
    assertTrue(Bytes.Equivalence(b(1, 2), b(1, 2)))
  })

  it("Order", () => {
    const cases: Array<[Uint8Array, Uint8Array, -1 | 0 | 1]> = [
      [b(), b(), 0],
      [b(1, 2), b(1, 2), 0],
      [b(1, 2), b(1, 3), -1],
      [b(2), b(1, 9), 1],
      [b(1), b(1, 0), -1],
      [b(0xff), b(0x00), 1]
    ]
    for (const [self, that, expected] of cases) {
      strictEqual(Bytes.Order(self, that), expected)
    }
    deepStrictEqual(Arr.sort([b(2), b(1, 1), b(1), b()], Bytes.Order), [b(), b(1), b(1, 1), b(2)])
  })

  it("indexOf", () => {
    const bytes = b(1, 13, 10, 2, 13, 10, 13)
    const crlf = b(13, 10)
    const cases: Array<[Uint8Array, number | undefined, number]> = [
      [crlf, undefined, 1],
      [crlf, 2, 4],
      [crlf, 5, -1],
      [b(13), 5, 6],
      [b(10, 13), undefined, 5],
      [b(13, 10, 13, 10), undefined, -1],
      [b(9), undefined, -1],
      [crlf, -3, 1],
      [b(), undefined, 0],
      [b(), 3, 3],
      [b(), 99, 7]
    ]
    for (const [search, fromIndex, expected] of cases) {
      strictEqual(Bytes.indexOf(bytes, search, fromIndex), expected)
      strictEqual(pipe(bytes, Bytes.indexOf(search, fromIndex)), expected)
    }
    strictEqual(Bytes.indexOf(b(1), b(1, 2)), -1)
  })

  it("startsWith / endsWith", () => {
    const bytes = b(1, 2, 3)
    assertTrue(Bytes.startsWith(bytes, b(1, 2)))
    assertTrue(Bytes.startsWith(bytes, b()))
    assertFalse(Bytes.startsWith(bytes, b(2)))
    assertFalse(Bytes.startsWith(b(1), b(1, 2)))
    assertTrue(pipe(bytes, Bytes.startsWith(b(1))))

    assertTrue(Bytes.endsWith(bytes, b(2, 3)))
    assertTrue(Bytes.endsWith(bytes, b()))
    assertFalse(Bytes.endsWith(bytes, b(2)))
    assertFalse(Bytes.endsWith(b(3), b(2, 3)))
    assertTrue(pipe(bytes, Bytes.endsWith(b(3))))
  })
})
