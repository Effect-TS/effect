/**
 * @since 2.0.0
 */
import type { TypeLambda } from "./HKT.js"

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface FunctionTypeLambda extends TypeLambda {
  readonly type: (a: this["In"]) => this["Target"]
}

/**
 * Tests if a value is a `function`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isFunction } from "effect/Predicate"
 *
 * assert.deepStrictEqual(isFunction(isFunction), true)
 * assert.deepStrictEqual(isFunction("function"), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isFunction = (input: unknown): input is Function => typeof input === "function"

/**
 * Creates a function that can be used in a data-last (aka `pipe`able) or
 * data-first style.
 *
 * The first parameter to `dual` is either the arity of the uncurried function
 * or a predicate that determines if the function is being used in a data-first
 * or data-last style.
 *
 * Using the arity is the most common use case, but there are some cases where
 * you may want to use a predicate. For example, if you have a function that
 * takes an optional argument, you can use a predicate to determine if the
 * function is being used in a data-first or data-last style.
 *
 * @param arity - Either the arity of the uncurried function or a predicate
 *                which determines if the function is being used in a data-first
 *                or data-last style.
 * @param body - The definition of the uncurried function.
 *
 * @example
 * import { dual, pipe } from "effect/Function"
 *
 * // Exampe using arity to determine data-first or data-last style
 * const sum: {
 *   (that: number): (self: number) => number
 *   (self: number, that: number): number
 * } = dual(2, (self: number, that: number): number => self + that)
 *
 * assert.deepStrictEqual(sum(2, 3), 5)
 * assert.deepStrictEqual(pipe(2, sum(3)), 5)
 *
 * // Example using a predicate to determine data-first or data-last style
 * const sum2: {
 *   (that: number): (self: number) => number
 *   (self: number, that: number): number
 * } = dual((args) => args.length === 1, (self: number, that: number): number => self + that)
 *
 * assert.deepStrictEqual(sum(2, 3), 5)
 * assert.deepStrictEqual(pipe(2, sum(3)), 5)
 *
 * @since 2.0.0
 */
export const dual: {
  <DataLast extends (...args: Array<any>) => any, DataFirst extends (...args: Array<any>) => any>(
    arity: Parameters<DataFirst>["length"],
    body: DataFirst
  ): DataLast & DataFirst
  <DataLast extends (...args: Array<any>) => any, DataFirst extends (...args: Array<any>) => any>(
    isDataFirst: (args: IArguments) => boolean,
    body: DataFirst
  ): DataLast & DataFirst
} = function(arity, body) {
  if (typeof arity === "function") {
    return function() {
      if (arity(arguments)) {
        // @ts-expect-error
        return body.apply(this, arguments)
      }
      return ((self: any) => body(self, ...arguments)) as any
    }
  }

  switch (arity) {
    case 0:
    case 1:
      throw new RangeError(`Invalid arity ${arity}`)

    case 2:
      return function(a, b) {
        if (arguments.length >= 2) {
          return body(a, b)
        }
        return function(self: any) {
          return body(self, a)
        }
      }

    case 3:
      return function(a, b, c) {
        if (arguments.length >= 3) {
          return body(a, b, c)
        }
        return function(self: any) {
          return body(self, a, b)
        }
      }

    case 4:
      return function(a, b, c, d) {
        if (arguments.length >= 4) {
          return body(a, b, c, d)
        }
        return function(self: any) {
          return body(self, a, b, c)
        }
      }

    case 5:
      return function(a, b, c, d, e) {
        if (arguments.length >= 5) {
          return body(a, b, c, d, e)
        }
        return function(self: any) {
          return body(self, a, b, c, d)
        }
      }

    default:
      return function() {
        if (arguments.length >= arity) {
          // @ts-expect-error
          return body.apply(this, arguments)
        }
        const args = arguments
        return function(self: any) {
          return body(self, ...args)
        }
      }
  }
}
/**
 * Apply a function to a given value.
 *
 * @param a - The value that the function will be applied to.
 * @param self - The function to be applied to a value.
 *
 * @example
 * import { pipe, apply } from "effect/Function"
 * import { length } from "effect/String"
 *
 * assert.deepStrictEqual(pipe(length, apply("hello")), 5)
 *
 * @since 2.0.0
 */
export const apply = <A>(a: A) => <B>(self: (a: A) => B): B => self(a)

/**
 * A lazy argument.
 *
 * @example
 * import { LazyArg, constant } from "effect/Function"
 *
 * const constNull: LazyArg<null> = constant(null)
 *
 * @since 2.0.0
 */
export interface LazyArg<A> {
  (): A
}

/**
 * @example
 * import { FunctionN } from "effect/Function"
 *
 * const sum: FunctionN<[number, number], number> = (a, b) => a + b
 *
 * @since 2.0.0
 */
export interface FunctionN<A extends ReadonlyArray<unknown>, B> {
  (...args: A): B
}

/**
 * The identity function, i.e. A function that returns its input argument.
 *
 * @param a - The input argument.
 *
 * @example
 * import { identity } from "effect/Function"
 *
 * assert.deepStrictEqual(identity(5), 5)
 *
 * @since 2.0.0
 */
export const identity = <A>(a: A): A => a

/**
 * A function that ensures that the type of an expression matches some type,
 * without changing the resulting type of that expression.
 *
 * @example
 * import { satisfies } from "effect/Function"
 *
 * const test1 = satisfies<number>()(5 as const)
 *     //^? const test: 5
 *     // @ts-expect-error
 * const test2 = satisfies<string>()(5)
 *     //^? Argument of type 'number' is not assignable to parameter of type 'string'
 *
 * assert.deepStrictEqual(satisfies<number>()(5), 5)
 *
 * @since 2.0.0
 */
export const satisfies = <A>() => <B extends A>(b: B) => b

/**
 * Casts the result to the specified type.
 *
 * @param a - The value to be casted to the target type.
 *
 * @example
 * import { unsafeCoerce, identity } from "effect/Function"
 *
 * assert.deepStrictEqual(unsafeCoerce, identity)
 *
 * @since 2.0.0
 */
export const unsafeCoerce: <A, B>(a: A) => B = identity as any

/**
 * Creates a constant value that never changes.
 *
 * This is useful when you want to pass a value to a higher-order function (a function that takes another function as its argument)
 * and want that inner function to always use the same value, no matter how many times it is called.
 *
 * @param value - The constant value to be returned.
 *
 * @example
 * import { constant } from "effect/Function"
 *
 * const constNull = constant(null)
 *
 * assert.deepStrictEqual(constNull(), null)
 * assert.deepStrictEqual(constNull(), null)
 *
 * @since 2.0.0
 */
export const constant = <A>(value: A): LazyArg<A> => () => value

/**
 * A thunk that returns always `true`.
 *
 * @example
 * import { constTrue } from "effect/Function"
 *
 * assert.deepStrictEqual(constTrue(), true)
 *
 * @since 2.0.0
 */
export const constTrue: LazyArg<boolean> = constant(true)

/**
 * A thunk that returns always `false`.
 *
 * @example
 * import { constFalse } from "effect/Function"
 *
 * assert.deepStrictEqual(constFalse(), false)
 *
 * @since 2.0.0
 */
export const constFalse: LazyArg<boolean> = constant(false)

/**
 * A thunk that returns always `null`.
 *
 * @example
 * import { constNull } from "effect/Function"
 *
 * assert.deepStrictEqual(constNull(), null)
 *
 * @since 2.0.0
 */
export const constNull: LazyArg<null> = constant(null)

/**
 * A thunk that returns always `undefined`.
 *
 * @example
 * import { constUndefined } from "effect/Function"
 *
 * assert.deepStrictEqual(constUndefined(), undefined)
 *
 * @since 2.0.0
 */
export const constUndefined: LazyArg<undefined> = constant(undefined)

/**
 * A thunk that returns always `void`.
 *
 * @example
 * import { constVoid } from "effect/Function"
 *
 * assert.deepStrictEqual(constVoid(), undefined)
 *
 * @since 2.0.0
 */
export const constVoid: LazyArg<void> = constUndefined

/**
 * Reverses the order of arguments for a curried function.
 *
 * @param f - A curried function that takes multiple arguments.
 *
 * @example
 * import { flip } from "effect/Function"
 *
 * const f = (a: number) => (b: string) => a - b.length
 *
 * assert.deepStrictEqual(flip(f)('aaa')(2), -1)
 *
 * @since 2.0.0
 */
export const flip = <A extends Array<unknown>, B extends Array<unknown>, C>(
  f: (...a: A) => (...b: B) => C
): (...b: B) => (...a: A) => C =>
(...b) =>
(...a) => f(...a)(...b)

/**
 * Composes two functions, `ab` and `bc` into a single function that takes in an argument `a` of type `A` and returns a result of type `C`.
 * The result is obtained by first applying the `ab` function to `a` and then applying the `bc` function to the result of `ab`.
 *
 * @param ab - A function that maps from `A` to `B`.
 * @param bc - A function that maps from `B` to `C`.
 *
 * @example
 * import { compose } from "effect/Function"
 *
 * const increment = (n: number) => n + 1;
 * const square = (n: number) => n * n;
 *
 * assert.strictEqual(compose(increment, square)(2), 9);
 *
 * @since 2.0.0
 */
export const compose: {
  <B, C>(bc: (b: B) => C): <A>(self: (a: A) => B) => (a: A) => C
  <A, B, C>(self: (a: A) => B, bc: (b: B) => C): (a: A) => C
} = dual(2, <A, B, C>(ab: (a: A) => B, bc: (b: B) => C): (a: A) => C => (a) => bc(ab(a)))

/**
 * The `absurd` function is a stub for cases where a value of type `never` is encountered in your code,
 * meaning that it should be impossible for this code to be executed.
 *
 * This function is particularly when it's necessary to specify that certain cases are impossible.
 *
 * @since 2.0.0
 */
export const absurd = <A>(_: never): A => {
  throw new Error("Called `absurd` function which should be uncallable")
}

/**
 * Creates a tupled version of this function: instead of `n` arguments, it accepts a single tuple argument.
 *
 * @example
 * import { tupled } from "effect/Function"
 *
 * const sumTupled = tupled((x: number, y: number): number => x + y)
 *
 * assert.deepStrictEqual(sumTupled([1, 2]), 3)
 *
 * @since 2.0.0
 */
export const tupled = <A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): (a: A) => B => (a) => f(...a)

/**
 * Inverse function of `tupled`
 *
 * @example
 * import { untupled } from "effect/Function"
 *
 * const getFirst = untupled(<A, B>(tuple: [A, B]): A => tuple[0])
 *
 * assert.deepStrictEqual(getFirst(1, 2), 1)
 *
 * @since 2.0.0
 */
export const untupled = <A extends ReadonlyArray<unknown>, B>(f: (a: A) => B): (...a: A) => B => (...a) => f(a)

/**
 * Pipes the value of an expression into a pipeline of functions.
 *
 * This is useful in combination with data-last functions as a simulation of methods:
 *
 * ```
 * as.map(f).filter(g) -> pipe(as, map(f), filter(g))
 * ```
 *
 * @example
 * import { pipe } from "effect/Function"
 * // Alternatively, you can use the following import syntax, as `pipe` is also conveniently exported from the `effect` entry point:
 * // import { pipe } from "effect"
 *
 * const length = (s: string): number => s.length
 * const double = (n: number): number => n * 2
 * const decrement = (n: number): number => n - 1
 *
 * assert.deepStrictEqual(pipe(length("hello"), double, decrement), 9)
 *
 * @since 2.0.0
 */
export function pipe<A>(a: A): A
export function pipe<A, B>(a: A, ab: (a: A) => B): B
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C
export function pipe<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D
export function pipe<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E
): E
export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F
): F
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G
): G
export function pipe<A, B, C, D, E, F, G, H>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H
): H
export function pipe<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I
): I
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J
): J
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K
): K
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L
): L
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M
): M
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N
): N
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O
): O
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P
): P
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P,
  pq: (p: P) => Q
): Q
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P,
  pq: (p: P) => Q,
  qr: (q: Q) => R
): R
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P,
  pq: (p: P) => Q,
  qr: (q: Q) => R,
  rs: (r: R) => S
): S
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P,
  pq: (p: P) => Q,
  qr: (q: Q) => R,
  rs: (r: R) => S,
  st: (s: S) => T
): T
export function pipe(
  a: unknown,
  ab?: Function,
  bc?: Function,
  cd?: Function,
  de?: Function,
  ef?: Function,
  fg?: Function,
  gh?: Function,
  hi?: Function
): unknown {
  switch (arguments.length) {
    case 1:
      return a
    case 2:
      return ab!(a)
    case 3:
      return bc!(ab!(a))
    case 4:
      return cd!(bc!(ab!(a)))
    case 5:
      return de!(cd!(bc!(ab!(a))))
    case 6:
      return ef!(de!(cd!(bc!(ab!(a)))))
    case 7:
      return fg!(ef!(de!(cd!(bc!(ab!(a))))))
    case 8:
      return gh!(fg!(ef!(de!(cd!(bc!(ab!(a)))))))
    case 9:
      return hi!(gh!(fg!(ef!(de!(cd!(bc!(ab!(a))))))))
    default: {
      let ret = arguments[0]
      for (let i = 1; i < arguments.length; i++) {
        ret = arguments[i](ret)
      }
      return ret
    }
  }
}

/**
 * Performs left-to-right function composition. The first argument may have any arity, the remaining arguments must be unary.
 *
 * See also [`pipe`](#pipe).
 *
 * @example
 * import { flow } from "effect/Function"
 *
 * const len = (s: string): number => s.length
 * const double = (n: number): number => n * 2
 *
 * const f = flow(len, double)
 *
 * assert.strictEqual(f('aaa'), 6)
 *
 * @since 2.0.0
 */
export function flow<A extends ReadonlyArray<unknown>, B>(ab: (...a: A) => B): (...a: A) => B
export function flow<A extends ReadonlyArray<unknown>, B, C>(ab: (...a: A) => B, bc: (b: B) => C): (...a: A) => C
export function flow<A extends ReadonlyArray<unknown>, B, C, D>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D
): (...a: A) => D
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E
): (...a: A) => E
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F
): (...a: A) => F
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F, G>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G
): (...a: A) => G
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F, G, H>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H
): (...a: A) => H
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F, G, H, I>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I
): (...a: A) => I
export function flow<A extends ReadonlyArray<unknown>, B, C, D, E, F, G, H, I, J>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J
): (...a: A) => J
export function flow(
  ab: Function,
  bc?: Function,
  cd?: Function,
  de?: Function,
  ef?: Function,
  fg?: Function,
  gh?: Function,
  hi?: Function,
  ij?: Function
): unknown {
  switch (arguments.length) {
    case 1:
      return ab
    case 2:
      return function(this: unknown) {
        return bc!(ab.apply(this, arguments))
      }
    case 3:
      return function(this: unknown) {
        return cd!(bc!(ab.apply(this, arguments)))
      }
    case 4:
      return function(this: unknown) {
        return de!(cd!(bc!(ab.apply(this, arguments))))
      }
    case 5:
      return function(this: unknown) {
        return ef!(de!(cd!(bc!(ab.apply(this, arguments)))))
      }
    case 6:
      return function(this: unknown) {
        return fg!(ef!(de!(cd!(bc!(ab.apply(this, arguments))))))
      }
    case 7:
      return function(this: unknown) {
        return gh!(fg!(ef!(de!(cd!(bc!(ab.apply(this, arguments)))))))
      }
    case 8:
      return function(this: unknown) {
        return hi!(gh!(fg!(ef!(de!(cd!(bc!(ab.apply(this, arguments))))))))
      }
    case 9:
      return function(this: unknown) {
        return ij!(hi!(gh!(fg!(ef!(de!(cd!(bc!(ab.apply(this, arguments)))))))))
      }
  }
  return
}

/**
 * Type hole simulation.
 *
 * @since 2.0.0
 */
export const hole: <T>() => T = unsafeCoerce(absurd)

/**
 * The SK combinator, also known as the "S-K combinator" or "S-combinator", is a fundamental combinator in the
 * lambda calculus and the SKI combinator calculus.
 *
 * This function is useful for discarding the first argument passed to it and returning the second argument.
 *
 * @param _ - The first argument to be discarded.
 * @param b - The second argument to be returned.
 *
 * @example
 * import { SK } from "effect/Function";
 *
 * assert.deepStrictEqual(SK(0, "hello"), "hello")
 *
 * @since 2.0.0
 */
export const SK = <A, B>(_: A, b: B): B => b
