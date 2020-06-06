import type { URIS, URIS2 } from "../utils/hkt"

export type URISIndexedAny = Record<URIS | URIS2, any>

export type AnyEnv = Partial<URISIndexedAny>

export interface GenConfig<A, R, K> {
  (a: A, r: R, k: K): A
}

export type NoEnv = unknown

export type MapToGenConfig<R extends AnyEnv, T extends URISIndexedAny, K> = {
  [k in URIS | URIS2]?: GenConfig<T[k], R[k], K[k]>
}

export interface ConfigType<E, A> {
  _E: E
  _A: A
}

export type ConfigsForType<R extends AnyEnv, E, A, K = {}> = MapToGenConfig<
  R,
  ConfigType<E, A>,
  K
>

export const getApplyConfig: <Uri extends URIS | URIS2>(
  uri: Uri
) => <Config>(config?: Config) => NonNullable<Config[Uri]> = (uri) => (config) =>
  ((a: any, r: any, k: any) =>
    ((config && config[uri] ? config[uri] : <A>(a: A) => a) as any)(
      a,
      r[uri],
      k
    )) as any
