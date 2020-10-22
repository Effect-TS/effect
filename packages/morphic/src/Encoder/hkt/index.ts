import type * as T from "@effect-ts/core/Sync"

export const EncoderURI = "EncoderURI" as const

export type EncoderURI = typeof EncoderURI

export interface Encoder<A, E> {
  encode: (e: A) => T.Sync<unknown, never, E>
}

declare module "../../Algebra/config" {
  export interface ConfigType<E, A> {
    [EncoderURI]: Encoder<A, E>
  }
}

export class EncoderType<A, E> {
  _A!: A
  _URI!: EncoderURI
  constructor(public encoder: Encoder<A, E>) {}
}

declare module "../../Algebra/utils/hkt" {
  interface URItoKind2<R, E, A> {
    [EncoderURI]: (env: R) => EncoderType<A, E>
  }
}

declare module "../../Internal/HKT" {
  interface URItoKind2<E, A> {
    [EncoderURI]: Encoder<A, E>
  }
}
