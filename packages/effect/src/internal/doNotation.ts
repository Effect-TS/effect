import { dual } from "../Function.js"
import type { Kind, TypeLambda } from "../HKT.js"

type Map<F extends TypeLambda> = {
  <A, B>(f: (a: A) => B): <R, O, E>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, B>
  <R, O, E, A, B>(self: Kind<F, R, O, E, A>, f: (a: A) => B): Kind<F, R, O, E, B>
}

/** @internal */
export const let_ = <F extends TypeLambda>(
  map: Map<F>
): {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): <R, O, E>(
    self: Kind<F, R, O, E, A>
  ) => Kind<F, R, O, E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>
  <R, O, E, A extends object, N extends string, B>(
    self: Kind<F, R, O, E, A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): Kind<F, R, O, E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>
} =>
  dual(3, <R, O, E, A extends object, N extends string, B>(
    self: Kind<F, R, O, E, A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): Kind<F, R, O, E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }> =>
    map(self, (a) => Object.assign({}, a, { [name]: f(a) }) as any))

/** @internal */
export const bindTo = <F extends TypeLambda>(map: Map<F>): {
  <N extends string>(
    name: N
  ): <R, O, E, A>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, { [K in N]: A }>
  <R, O, E, A, N extends string>(
    self: Kind<F, R, O, E, A>,
    name: N
  ): Kind<F, R, O, E, { [K in N]: A }>
} =>
  dual(2, <R, O, E, A, N extends string>(
    self: Kind<F, R, O, E, A>,
    name: N
  ): Kind<F, R, O, E, { [K in N]: A }> => map(self, (a) => ({ [name]: a } as { [K in N]: A })))
