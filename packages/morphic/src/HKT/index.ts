import type { Record } from "@effect-ts/core/Classic/Record"
import type { UnionToIntersection } from "@effect-ts/core/Utils"

import type { AlgebraIntersections } from "../Algebra/Intersection"
import { IntersectionURI } from "../Algebra/Intersection"
import type { AlgebraNewtypes } from "../Algebra/Newtype"
import { NewtypeURI } from "../Algebra/Newtype"
import type { AlgebraObjects } from "../Algebra/Object"
import { ObjectURI } from "../Algebra/Object"
import type { AlgebraPrimitives } from "../Algebra/Primitives"
import { PrimitivesURI } from "../Algebra/Primitives"
import type { AlgebraRecord, RecordURI } from "../Algebra/Record"
import type { AlgebraRecursive } from "../Algebra/Recursive"
import { RecursiveURI } from "../Algebra/Recursive"
import type { AlgebraRefined } from "../Algebra/Refined"
import { RefinedURI } from "../Algebra/Refined"
import type { AlgebraSet } from "../Algebra/Set"
import { SetURI } from "../Algebra/Set"
import type { AlgebraTaggedUnion } from "../Algebra/TaggedUnion"
import { TaggedUnionURI } from "../Algebra/TaggedUnion"
import type { AlgebraUnion } from "../Algebra/Union"
import { UnionURI } from "../Algebra/Union"
import type { AlgebraUnknown } from "../Algebra/Unknown"
import { UnknownURI } from "../Algebra/Unknown"
import { memo } from "../Utils"

export type URISIndexedAny = Record<InterpreterURIS, any>

export type AnyEnv = Partial<URISIndexedAny>

export interface GenConfig<A, R, K> {
  (a: A, r: R, k: K): A
}

export type NoEnv = unknown

export type MapToGenConfig<R extends AnyEnv, T extends URISIndexedAny, K> = {
  [k in Exclude<InterpreterURIS, "HKT">]?: GenConfig<T[k], R[k], ThreadURI<K, k>>
}

export interface ConfigType<E, A> {
  readonly _E: E
  readonly _A: A

  readonly ["HKT"]: never
}

export type ConfigsForType<R extends AnyEnv, E, A, K = {}> = MapToGenConfig<
  R,
  ConfigType<E, A>,
  K
>

export type ThreadURI<C, URI extends InterpreterURIS> = URI extends keyof C
  ? C[URI]
  : unknown

export const getApplyConfig: <Uri extends InterpreterURIS>(
  uri: Uri
) => <Config>(config?: Config) => NonNullable<ThreadURI<Config, Uri>> = (uri) => (
  config
) =>
  ((a: any, r: any, k: any) =>
    ((config && (config as any)[uri] ? (config as any)[uri] : <A>(a: A) => a) as any)(
      a,
      r[uri],
      k
    )) as any

export type Named<A> = {
  name?: string
  id?: string
  conf?: A
}

export interface HKT<R, E, A> {
  readonly _R: (_R: R) => void
  readonly _E: E
  readonly _A: A
}

export interface URItoKind<R, E, A> {
  readonly _R: R
  readonly _E: E
  readonly _A: A

  readonly ["HKT"]: HKT<R, E, A>
}

export type InterpreterURIS = Exclude<
  keyof URItoKind<any, any, any>,
  "_A" | "_E" | "_R" | "_C"
>

export type Kind<URI extends InterpreterURIS, R, E, A> = URI extends InterpreterURIS
  ? URItoKind<R, E, A>[URI]
  : any

export interface URItoAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  _R: Env

  [PrimitivesURI]: AlgebraPrimitives<F, Env>
  [TaggedUnionURI]: AlgebraTaggedUnion<F, Env>
  [UnionURI]: AlgebraUnion<F, Env>
  [IntersectionURI]: AlgebraIntersections<F, Env>
  [ObjectURI]: AlgebraObjects<F, Env>
  [NewtypeURI]: AlgebraNewtypes<F, Env>
  [RecordURI]: AlgebraRecord<F, Env>
  [RecursiveURI]: AlgebraRecursive<F, Env>
  [RefinedURI]: AlgebraRefined<F, Env>
  [SetURI]: AlgebraSet<F, Env>
  [UnknownURI]: AlgebraUnknown<F, Env>
}

export type AlgebraURIS = Exclude<keyof URItoAlgebra<never, never>, "_F" | "_R">

export type ConfigTypeURIS = keyof ConfigType<any, any>

export type ConfigTypeKind<URI extends ConfigTypeURIS, E, A> = ConfigType<E, A>[URI]

export type GetAlgebra<A extends AlgebraURIS> = A

export type Algebra<
  AllAlgebra extends AlgebraURIS,
  Interp extends InterpreterURIS,
  Env extends AnyEnv
> = UnionToIntersection<URItoAlgebra<Interp, Env>[AllAlgebra]>

export function interpreter<IURI extends InterpreterURIS, AURI extends AlgebraURIS>(): (
  i: <Env extends AnyEnv>() => Algebra<AURI, IURI, Env>
) => <Env extends AnyEnv>() => Algebra<AURI, IURI, Env>
export function interpreter() {
  return (i: () => any) => memo(i)
}
