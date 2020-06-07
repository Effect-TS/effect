import type { Codec } from "../codec"

export const ModelURI = "@matechs/morphic/ModelURI" as const

export type ModelURI = typeof ModelURI

declare module "@matechs/morphic-alg/config" {
  export interface ConfigType<E, A> {
    [ModelURI]: Codec<A, E>
  }
}

export class ModelType<O, A> {
  _A!: A
  _E!: O
  _URI!: ModelURI

  constructor(public codec: Codec<A, O>) {}
}

declare module "@matechs/morphic-alg/utils/hkt" {
  interface URItoKind2<R, E, A> {
    [ModelURI]: (env: R) => ModelType<E, A>
  }
}

declare module "@matechs/core/Base/HKT" {
  interface URItoKind2<E, A> {
    [ModelURI]: Codec<A, E>
  }
}
