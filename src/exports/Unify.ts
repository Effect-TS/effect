import type { ignoreSymbol, typeSymbol, unifySymbol } from "../Unify.js"

export * from "../internal/Jumpers/Unify.js"
export * from "../Unify.js"

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

export declare namespace Unify {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../Unify.js"
}
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
