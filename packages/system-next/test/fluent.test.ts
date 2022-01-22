/**
 * @ets type ets/Int
 */
export interface Int {
  n: number
}

/**
 * @ets operator ets/Int +
 */
export function add(self: Int, that: Int): Int {
  return {
    n: self.n + that.n
  }
}

export function int<A extends number>(n: `${A}` extends `${bigint}` ? A : never): Int {
  return {
    n
  }
}

export const ok = int(0) + int(1)

it("works", () => {
  expect(ok).toEqual({ n: 1 })
})
