/**
 * @since 2.0.0
 */

import { identity } from "./Function.js"

/**
 * @since 2.0.0
 */
export declare const unifySymbol: unique symbol

/**
 * @since 2.0.0
 */
export type unifySymbol = typeof unifySymbol

/**
 * @since 2.0.0
 */
export declare const typeSymbol: unique symbol

/**
 * @since 2.0.0
 */
export type typeSymbol = typeof typeSymbol

/**
 * @since 2.0.0
 */
export declare const ignoreSymbol: unique symbol

/**
 * @since 2.0.0
 */
export type ignoreSymbol = typeof ignoreSymbol

type MaybeReturn<F> = F extends () => any ? ReturnType<F> : F

type Values<X extends [any, any]> = X extends any
  ? { [k in keyof X[0]]-?: k extends X[1] ? never : MaybeReturn<X[0][k]> }[keyof X[0]]
  : never

type Ignore<X> = X extends {
  [ignoreSymbol]?: any
} ? keyof NonNullable<X[ignoreSymbol]>
  : never

type ExtractTypes<
  X extends {
    [typeSymbol]?: any
    [unifySymbol]?: any
  }
> = X extends any ? [
    NonNullable<X[unifySymbol]>,
    Ignore<X>
  ]
  : never

type FilterIn<A> = A extends any ? typeSymbol extends keyof A ? A : never : never

type FilterOut<A> = A extends any ? typeSymbol extends keyof A ? never : A : never

/**
 * @since 2.0.0
 */
export type Unify<A> = Values<
  ExtractTypes<
    (
      & FilterIn<A>
      & { [typeSymbol]: A }
    )
  >
> extends infer Z ? Z | Exclude<A, Z> | FilterOut<A> : never

/**
 * @since 2.0.0
 */
export const unify: {
  <
    Args extends Array<any>,
    Args2 extends Array<any>,
    Args3 extends Array<any>,
    Args4 extends Array<any>,
    Args5 extends Array<any>,
    T
  >(
    x: (...args: Args) => (...args: Args2) => (...args: Args3) => (...args: Args4) => (...args: Args5) => T
  ): (...args: Args) => (...args: Args2) => (...args: Args3) => (...args: Args4) => (...args: Args5) => Unify<T>
  <
    Args extends Array<any>,
    Args2 extends Array<any>,
    Args3 extends Array<any>,
    Args4 extends Array<any>,
    T
  >(
    x: (...args: Args) => (...args: Args2) => (...args: Args3) => (...args: Args4) => T
  ): (...args: Args) => (...args: Args2) => (...args: Args3) => (...args: Args4) => Unify<T>
  <
    Args extends Array<any>,
    Args2 extends Array<any>,
    Args3 extends Array<any>,
    T
  >(
    x: (...args: Args) => (...args: Args2) => (...args: Args3) => T
  ): (...args: Args) => (...args: Args2) => (...args: Args3) => Unify<T>
  <
    Args extends Array<any>,
    Args2 extends Array<any>,
    T
  >(
    x: (...args: Args) => (...args: Args2) => T
  ): (...args: Args) => (...args: Args2) => Unify<T>
  <
    Args extends Array<any>,
    T
  >(x: (...args: Args) => T): (...args: Args) => Unify<T>
  <T>(x: T): Unify<T>
} = identity as any
