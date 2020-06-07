import type { Errors, Codec } from "../codec"
import type { Validated } from "../create"

import { map_, Either } from "@matechs/core/Either"

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
  create: (a: A) => Either<Errors, Validated<A>>
  constructor(public codec: Codec<A, O>) {
    this.create = (a) =>
      map_(this.codec.decode(this.codec.encode(a)), (x: A) => x as Validated<A>)
  }
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
