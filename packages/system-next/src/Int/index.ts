/**
 * @ets type ets/Int
 */
export interface Int {
  readonly Int: unique symbol
}

/**
 * @ets type ets/IntOps
 */
export interface IntOps {}
export const Int: IntOps = {}

/**
 * @ets operator ets/Int +
 * @ets inline +
 */
export function add(self: Int, that: Int): Int {
  return Int.unsafeFromNumber(self.asNumber() + that.asNumber())
}

/**
 * @ets operator ets/Int *
 * @ets inline *
 */
export function multiply(self: Int, that: Int): Int {
  return Int.unsafeFromNumber(self.asNumber() * that.asNumber())
}

/**
 * @ets operator ets/Int /
 */
export function divide(self: Int, that: Int): Int {
  return Int.unsafeFromNumber((self.asNumber() / that.asNumber()) >> 0)
}

/**
 * @ets operator ets/Int %
 */
export function divisionRest(self: Int, that: Int): Int {
  return Int.unsafeFromNumber(self.asNumber() % that.asNumber())
}

/**
 * @ets operator ets/Int -
 * @ets inline -
 */
export function subtract(self: Int, that: Int): Int {
  return Int.unsafeFromNumber(self.asNumber() - that.asNumber())
}

/**
 * @ets static ets/IntOps of
 * @ets inline identity
 */
export function int<A extends number>(n: `${A}` extends `${bigint}` ? A : never): Int {
  return n as unknown as Int
}

/**
 * @ets static ets/IntOps unsafeFromNumber
 */
export function unsafeFromNumber(n: number): Int {
  if (!Number.isInteger(n)) {
    throw new Error(`Int.unsafeFromNumber: ${n} is not an integer`)
  }
  return n as unknown as Int
}

/**
 * @ets fluent ets/Int asNumber
 * @ets inline identity
 */
export function asNumber(self: Int): number {
  return self as unknown as number
}
