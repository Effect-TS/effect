import type { Validated } from "../create"

import { map, Either } from "@matechs/core/Either"
import type { Errors, Type } from "@matechs/core/Model"

export const ModelURI = "@matechs/morphic/ModelURI" as const

export type ModelURI = typeof ModelURI

declare module "@morphic-ts/common/lib/config" {
  export interface ConfigType<E, A> {
    [ModelURI]: Type<A, E>
  }
}

export class ModelType<O, A> {
  _A!: A
  _E!: O
  _URI!: ModelURI
  create: (a: A) => Either<Errors, Validated<A>>
  constructor(public type: Type<A, O>) {
    this.create = (a) =>
      map((x: A) => x as Validated<A>)(this.type.decode(this.type.encode(a)))
  }
}

declare module "@morphic-ts/common/lib/HKT" {
  interface URItoKind2<R, E, A> {
    [ModelURI]: (env: R) => ModelType<E, A>
  }
}
