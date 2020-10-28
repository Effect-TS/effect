import type { Validate } from "../common"

export const DecoderURI = "DecoderURI" as const

export type DecoderURI = typeof DecoderURI

declare module "../../Algebra/config" {
  export interface ConfigType<E, A> {
    [DecoderURI]: Validate<A>
  }
}

export class DecoderType<A> {
  _A!: A
  _URI!: DecoderURI
  constructor(public decoder: Validate<A>) {}
}

declare module "../../Algebra/utils/hkt" {
  interface URItoKind<R, A> {
    [DecoderURI]: (env: R) => DecoderType<A>
  }
}

declare module "../../Internal/HKT" {
  interface URItoKind<A> {
    [DecoderURI]: Validate<A>
  }
}
