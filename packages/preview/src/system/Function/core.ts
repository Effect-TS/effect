import { flow } from "./flow"
import { pipe } from "./pipe"

export { flow, pipe }

/**
 * Models () => A
 */
export interface Lazy<A> {
  (): A
}

/**
 * Models (a: A) => boolean
 */
export interface Predicate<A> {
  (a: A): boolean
}

/**
 * Models (a: A) => a is B
 */
export interface Refinement<A, B extends A> {
  (a: A): a is B
}

/**
 * Models (a: A) => A
 */
export interface Endomorphism<A> {
  (a: A): A
}

/**
 * Models (...args: A) => B
 */
export interface FunctionN<A extends ReadonlyArray<unknown>, B> {
  (...args: A): B
}

/**
 * Will raise if called
 */
export function absurd<A>(_: never): A {
  throw new Error("Called `absurd` function which should be uncallable")
}

/**
 * A constant function that always return A
 */
export function constant<A>(a: A): Lazy<A> {
  return () => a
}

/**
 * A thunk that returns always `false`
 */
export const constFalse = (): boolean => {
  return false
}

/**
 * A thunk that returns always `null`
 */
export const constNull = (): null => {
  return null
}

/**
 * A thunk that returns always `true`
 */
export const constTrue = (): boolean => {
  return true
}

/**
 * A thunk that returns always `undefined`
 */
export const constUndefined = (): undefined => {
  return
}

/**
 * A thunk that returns always `void`
 */
export const constVoid = (): void => {
  return
}

/**
 * Flips the order of the arguments of a function of two arguments.
 */
export function flip<A, B, C>(f: (a: A, b: B) => C): (b: B, a: A) => C {
  return (b, a) => f(a, b)
}

/**
 * Identity function
 */
export function identity<A>(a: A): A {
  return a
}

/**
 * Inverts a boolean predicate
 */
export function not<A>(predicate: Predicate<A>): Predicate<A> {
  return (a) => !predicate(a)
}

/**
 * Construct tuples
 */
export function tuple<T extends ReadonlyArray<any>>(...t: T): Readonly<T> {
  return t
}

/**
 * Creates a tupled version of this function: instead of `n` arguments, it accepts a single tuple argument.
 *
 * @example
 * const add = tupled((x: number, y: number): number => x + y)
 *
 * assert.strictEqual(add([1, 2]), 3)
 */
export function tupled<A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => B
): (a: A) => B {
  return (a) => f(...a)
}

/**
 * Inverse function of `tupled`
 */
export function untupled<A extends ReadonlyArray<unknown>, B>(
  f: (a: A) => B
): (...a: A) => B {
  return (...a) => f(a)
}

/**
 * Performs unsafe coercion of types
 */
export const unsafeCoerce: <A, B>(a: A) => B = identity as any
