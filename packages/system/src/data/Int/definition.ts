/**
 * @tsplus type ets/Int
 */
export interface Int {
  readonly Int: unique symbol
}

/**
 * @tsplus type ets/IntOps
 */
export interface IntOps {}
export const Int: IntOps = {}

/**
 * @tsplus operator ets/Int +
 * @tsplus inline +
 */
export function add(self: Int, that: Int): Int {
  return Int.unsafeFromNumber(self.asNumber() + that.asNumber())
}

/**
 * @tsplus operator ets/Int *
 * @tsplus inline *
 */
export function multiply(self: Int, that: Int): Int {
  return Int.unsafeFromNumber(self.asNumber() * that.asNumber())
}

/**
 * @tsplus operator ets/Int /
 */
export function divide(self: Int, that: Int): Int {
  return Int.unsafeFromNumber((self.asNumber() / that.asNumber()) >> 0)
}

/**
 * @tsplus operator ets/Int %
 * @tsplus inline identity
 */
export function divisionRest(self: Int, that: Int): Int {
  return Int.unsafeFromNumber(self.asNumber() % that.asNumber())
}

/**
 * @tsplus operator ets/Int -
 * @tsplus inline -
 */
export function subtract(self: Int, that: Int): Int {
  return Int.unsafeFromNumber(self.asNumber() - that.asNumber())
}

/**
 * @tsplus static ets/IntOps of
 * @tsplus inline identity
 */
export function int<A extends number>(n: `${A}` extends `${bigint}` ? A : never): Int {
  return n as unknown as Int
}

/**
 * @tsplus static ets/IntOps unsafeFromNumber
 */
export function unsafeFromNumber(n: number): Int {
  if (!Number.isInteger(n)) {
    throw new Error(`Int.unsafeFromNumber: ${n} is not an integer`)
  }
  return n as unknown as Int
}

/**
 * @tsplus fluent ets/Int asNumber
 * @tsplus inline identity
 */
export function asNumber(self: Int): number {
  return self as unknown as number
}
