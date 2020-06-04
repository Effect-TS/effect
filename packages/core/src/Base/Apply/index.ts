/* adapted from https://github.com/gcanti/fp-ts */

export { sequenceS as sequenceS_, sequenceT as sequenceT_ } from "fp-ts/lib/Apply"

import type { URI as EitherURI } from "../../Either"
import type { Apply2M } from "../../Either/overloads"
import { tuple } from "../../Function"
import type { GE } from "../../Utils"
import type {
  CFunctor,
  CFunctor1,
  CFunctor2,
  CFunctor2C,
  CFunctor3,
  CFunctor3C,
  CFunctor4,
  CFunctor4C
} from "../Functor"
import type {
  HKT,
  URIS,
  Kind,
  URIS2,
  Kind2,
  URIS3,
  Kind3,
  URIS4,
  Kind4,
  MaURIS
} from "../HKT"

export interface CApply<F> extends CFunctor<F> {
  readonly ap: <A>(fa: HKT<F, A>) => <B>(fab: HKT<F, (a: A) => B>) => HKT<F, B>
}
export interface CApply1<F extends URIS> extends CFunctor1<F> {
  readonly ap: <A>(fa: Kind<F, A>) => <B>(fab: Kind<F, (a: A) => B>) => Kind<F, B>
}
export interface CApply2<F extends URIS2> extends CFunctor2<F> {
  readonly ap: <E, A>(
    fa: Kind2<F, E, A>
  ) => <B>(fab: Kind2<F, E, (a: A) => B>) => Kind2<F, E, B>
}
export interface CApply2C<F extends URIS2, E> extends CFunctor2C<F, E> {
  readonly ap: <A>(
    fa: Kind2<F, E, A>
  ) => <B>(fab: Kind2<F, E, (a: A) => B>) => Kind2<F, E, B>
}
export interface CApply3<F extends URIS3> extends CFunctor3<F> {
  readonly ap: <R, E, A>(
    fa: Kind3<F, R, E, A>
  ) => <B>(fab: Kind3<F, R, E, (a: A) => B>) => Kind3<F, R, E, B>
}
export interface CApply3C<F extends URIS3, E> extends CFunctor3C<F, E> {
  readonly ap: <R, A>(
    fa: Kind3<F, R, E, A>
  ) => <B>(fab: Kind3<F, R, E, (a: A) => B>) => Kind3<F, R, E, B>
}
export interface CApply4<F extends URIS4> extends CFunctor4<F> {
  readonly ap: <S, R, E, A>(
    fa: Kind4<F, S, R, E, A>
  ) => <B>(fab: Kind4<F, S, R, E, (a: A) => B>) => Kind4<F, S, R, E, B>
}
export interface CApply4MA<F extends MaURIS> extends CFunctor4<F> {
  readonly ap: <S2, R2, E2, A>(
    fa: Kind4<F, S2, R2, E2, A>
  ) => <S, R, E, B>(
    fab: Kind4<F, S, R, E, (a: A) => B>
  ) => Kind4<F, S | S2, R & R2, E | E2, B>
}
export interface CApply4MAC<F extends MaURIS, E> extends CFunctor4C<F, E> {
  readonly ap: <S2, R2, A>(
    fa: Kind4<F, S2, R2, E, A>
  ) => <S, R, B>(fab: Kind4<F, S, R, E, (a: A) => B>) => Kind4<F, S | S2, R & R2, E, B>
}
export interface CApply4MAP<F extends MaURIS> extends CFunctor4<F> {
  readonly _CTX: "async"
  readonly ap: <S2, R2, E2, A>(
    fa: Kind4<F, S2, R2, E2, A>
  ) => <S, R, E, B>(
    fab: Kind4<F, S, R, E, (a: A) => B>
  ) => Kind4<F, unknown, R & R2, E | E2, B>
}
export interface CApply4MAPC<F extends MaURIS, E> extends CFunctor4C<F, E> {
  readonly _CTX: "async"
  readonly ap: <S2, R2, A>(
    fa: Kind4<F, S2, R2, E, A>
  ) => <S, R, B>(fab: Kind4<F, S, R, E, (a: A) => B>) => Kind4<F, unknown, R & R2, E, B>
}

function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
  return function (x: unknown) {
    const combined = acc.concat([x])
    // eslint-disable-next-line prefer-spread
    return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined)
  }
}

const tupleConstructors: Record<number, (a: unknown) => unknown> =
  /*#__PURE__*/
  (() => ({}))()

function getTupleConstructor(len: number): (a: unknown) => any {
  // eslint-disable-next-line no-prototype-builtins
  if (!tupleConstructors.hasOwnProperty(len)) {
    tupleConstructors[len] = curried(tuple, len - 1, [])
  }
  return tupleConstructors[len]
}

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

export type STypeOf<X> = X extends GE<infer _S, infer _R, infer _E, infer _A>
  ? _S
  : never

export type ATypeOf<X> = X extends GE<infer _S, infer _R, infer _E, infer _A>
  ? _A
  : never

export type ETypeOf<X> = X extends GE<infer _S, infer _R, infer _E, infer _A>
  ? _E
  : never

export type RTypeOf<X> = X extends GE<infer _S, infer _R, infer _E, infer _A>
  ? _R
  : never

export type EnvOf<
  R extends Record<string, GE<any, any, any, any>>
> = UnionToIntersection<
  {
    [K in keyof R]: unknown extends RTypeOf<R[K]> ? never : RTypeOf<R[K]>
  }[keyof R]
>

export type SOf<R extends Record<string, GE<any, any, any, any>>> = {
  [K in keyof R]: STypeOf<R[K]>
}[keyof R]

export function sequenceT<F extends EitherURI>(
  F: Apply2M<F>
): <Z extends Array<Kind2<F, any, any>>>(
  ...t: Z & {
    readonly 0: Kind2<F, any, any>
  }
) => Kind2<
  F,
  {
    [K in keyof Z]: Z[K] extends Kind2<F, infer _E, infer _A> ? _E : never
  }[number],
  {
    [K in keyof Z]: Z[K] extends Kind2<F, infer _E, infer _A> ? _A : never
  }
>
export function sequenceT<F extends MaURIS>(
  F: CApply4MAP<F>
): <T extends Array<Kind4<F, any, any, any, any>>>(
  ...t: T & {
    0: Kind4<F, any, any, any, any>
  }
) => Kind4<
  F,
  unknown,
  UnionToIntersection<
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[number]
  >,
  {
    [K in keyof T]: [T[K]] extends [Kind4<F, any, any, infer E, any>] ? E : never
  }[number],
  {
    [K in keyof T]: [T[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
  }
>
export function sequenceT<F extends MaURIS>(
  F: CApply4MA<F>
): <T extends Array<Kind4<F, any, any, any, any>>>(
  ...t: T & {
    0: Kind4<F, any, any, any, any>
  }
) => Kind4<
  F,
  {
    [K in keyof T]: [T[K]] extends [Kind4<F, infer S, any, any, any>] ? S : never
  }[number],
  UnionToIntersection<
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[number]
  >,
  {
    [K in keyof T]: [T[K]] extends [Kind4<F, any, any, infer E, any>] ? E : never
  }[number],
  {
    [K in keyof T]: [T[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
  }
>
export function sequenceT<F extends MaURIS, E>(
  F: CApply4MAPC<F, E>
): <T extends Array<Kind4<F, any, any, E, any>>>(
  ...t: T & {
    0: Kind4<F, any, any, E, any>
  }
) => Kind4<
  F,
  unknown,
  UnionToIntersection<
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[number]
  >,
  E,
  {
    [K in keyof T]: [T[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
  }
>
export function sequenceT<F extends MaURIS, E>(
  F: CApply4MAC<F, E>
): <T extends Array<Kind4<F, any, any, E, any>>>(
  ...t: T & {
    0: Kind4<F, any, any, E, any>
  }
) => Kind4<
  F,
  {
    [K in keyof T]: [T[K]] extends [Kind4<F, infer S, any, any, any>] ? S : never
  }[number],
  UnionToIntersection<
    {
      [K in keyof T]: [T[K]] extends [Kind4<F, any, infer R, any, any>]
        ? unknown extends R
          ? never
          : R
        : never
    }[number]
  >,
  E,
  {
    [K in keyof T]: [T[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
  }
>
export function sequenceT<F extends URIS4>(
  F: CApply4<F>
): <S, R, E, T extends Array<Kind4<F, S, R, E, any>>>(
  ...t: T & { readonly 0: Kind4<F, S, R, E, any> }
) => Kind4<
  F,
  S,
  R,
  E,
  { [K in keyof T]: [T[K]] extends [Kind4<F, S, R, E, infer A>] ? A : never }
>
export function sequenceT<F extends URIS3>(
  F: CApply3<F>
): <R, E, T extends Array<Kind3<F, R, E, any>>>(
  ...t: T & { readonly 0: Kind3<F, R, E, any> }
) => Kind3<
  F,
  R,
  E,
  { [K in keyof T]: [T[K]] extends [Kind3<F, R, E, infer A>] ? A : never }
>
export function sequenceT<F extends URIS3, E>(
  F: CApply3C<F, E>
): <R, T extends Array<Kind3<F, R, E, any>>>(
  ...t: T & { readonly 0: Kind3<F, R, E, any> }
) => Kind3<
  F,
  R,
  E,
  { [K in keyof T]: [T[K]] extends [Kind3<F, R, E, infer A>] ? A : never }
>
export function sequenceT<F extends URIS2>(
  F: CApply2<F>
): <E, T extends Array<Kind2<F, E, any>>>(
  ...t: T & { readonly 0: Kind2<F, E, any> }
) => Kind2<F, E, { [K in keyof T]: [T[K]] extends [Kind2<F, E, infer A>] ? A : never }>
export function sequenceT<F extends URIS2, E>(
  F: CApply2C<F, E>
): <T extends Array<Kind2<F, E, any>>>(
  ...t: T & { readonly 0: Kind2<F, E, any> }
) => Kind2<F, E, { [K in keyof T]: [T[K]] extends [Kind2<F, E, infer A>] ? A : never }>
export function sequenceT<F extends URIS>(
  F: CApply1<F>
): <T extends Array<Kind<F, any>>>(
  ...t: T & { readonly 0: Kind<F, any> }
) => Kind<F, { [K in keyof T]: [T[K]] extends [Kind<F, infer A>] ? A : never }>
export function sequenceT<F>(
  F: CApply<F>
): <T extends Array<HKT<F, any>>>(
  ...t: T & { readonly 0: HKT<F, any> }
) => HKT<F, { [K in keyof T]: [T[K]] extends [HKT<F, infer A>] ? A : never }>
export function sequenceT<F>(F: CApply<F>): any {
  return <A>(...args: Array<HKT<F, A>>) => {
    const len = args.length
    const f = getTupleConstructor(len)
    let fas = F.map(f)(args[0])
    for (let i = 1; i < len; i++) {
      fas = F.ap(args[i])(fas)
    }
    return fas
  }
}

type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

function getRecordConstructor(keys: ReadonlyArray<string>) {
  const len = keys.length
  return curried(
    (...args: ReadonlyArray<unknown>) => {
      const r: Record<string, unknown> = {}
      for (let i = 0; i < len; i++) {
        r[keys[i]] = args[i]
      }
      return r
    },
    len - 1,
    []
  )
}

export function sequenceS<F extends EitherURI>(
  F: Apply2M<F>
): <NER extends Record<string, Kind2<F, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind2<F, any, any>>
) => Kind2<
  F,
  {
    [K in keyof NER]: [NER[K]] extends [Kind2<F, infer _E, infer _A>] ? _E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Kind2<F, infer _E, infer _A>] ? _A : never
  }
>
export function sequenceS<F extends MaURIS>(
  F: CApply4MA<F>
): <NER extends Record<string, Kind4<F, any, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, any, any, any, any>>
) => Kind4<
  F,
  SOf<NER>,
  EnvOf<NER>,
  {
    [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
  }
>
export function sequenceS<F extends MaURIS, E>(
  F: CApply4MAC<F, E>
): <NER extends Record<string, Kind4<F, any, any, E, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, any, any, E, any>>
) => Kind4<
  F,
  SOf<NER>,
  EnvOf<NER>,
  E,
  {
    [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
  }
>
export function sequenceS<F extends MaURIS, E>(
  F: CApply4MAPC<F, E>
): <NER extends Record<string, Kind4<F, any, any, E, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, any, any, E, any>>
) => Kind4<
  F,
  unknown,
  EnvOf<NER>,
  E,
  {
    [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
  }
>
export function sequenceS<F extends MaURIS>(
  F: CApply4MAP<F>
): <NER extends Record<string, Kind4<F, any, any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, any, any, any, any>>
) => Kind4<
  F,
  unknown,
  EnvOf<NER>,
  {
    [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, infer E, any>] ? E : never
  }[keyof NER],
  {
    [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never
  }
>
export function sequenceS<F extends URIS4>(
  F: CApply4<F>
): <S, R, E, NER extends Record<string, Kind4<F, S, R, E, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind4<F, S, R, E, any>>
) => Kind4<
  F,
  S,
  R,
  E,
  { [K in keyof NER]: [NER[K]] extends [Kind4<F, any, any, any, infer A>] ? A : never }
>
export function sequenceS<F extends URIS3>(
  F: CApply3<F>
): <R, E, NER extends Record<string, Kind3<F, R, E, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind3<F, R, E, any>>
) => Kind3<
  F,
  R,
  E,
  { [K in keyof NER]: [NER[K]] extends [Kind3<F, any, any, infer A>] ? A : never }
>
export function sequenceS<F extends URIS3, E>(
  F: CApply3C<F, E>
): <R, NER extends Record<string, Kind3<F, R, E, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind3<F, R, E, any>>
) => Kind3<
  F,
  R,
  E,
  { [K in keyof NER]: [NER[K]] extends [Kind3<F, any, any, infer A>] ? A : never }
>
export function sequenceS<F extends URIS2>(
  F: CApply2<F>
): <E, NER extends Record<string, Kind2<F, E, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, Kind2<F, E, any>>
) => Kind2<
  F,
  E,
  { [K in keyof NER]: [NER[K]] extends [Kind2<F, any, infer A>] ? A : never }
>
export function sequenceS<F extends URIS2, E>(
  F: CApply2C<F, E>
): <NER extends Record<string, Kind2<F, E, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind2<
  F,
  E,
  { [K in keyof NER]: [NER[K]] extends [Kind2<F, any, infer A>] ? A : never }
>
export function sequenceS<F extends URIS>(
  F: CApply1<F>
): <NER extends Record<string, Kind<F, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => Kind<F, { [K in keyof NER]: [NER[K]] extends [Kind<F, infer A>] ? A : never }>
export function sequenceS<F>(
  F: CApply<F>
): <NER extends Record<string, HKT<F, any>>>(
  r: EnforceNonEmptyRecord<NER>
) => HKT<F, { [K in keyof NER]: [NER[K]] extends [HKT<F, infer A>] ? A : never }>
export function sequenceS<F>(
  F: CApply<F>
): (r: Record<string, HKT<F, any>>) => HKT<F, Record<string, any>> {
  return (r) => {
    const keys = Object.keys(r)
    const len = keys.length
    const f = getRecordConstructor(keys)
    let fr = F.map(f)(r[keys[0]])
    for (let i = 1; i < len; i++) {
      fr = F.ap(r[keys[i]])(fr)
    }
    return fr
  }
}
