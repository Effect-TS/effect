import { getApplyConfig } from "../../HKT"
import type { Validate } from "../common"

export const DecoderURI = "DecoderURI" as const

export type DecoderURI = typeof DecoderURI

export const decoderApplyConfig = getApplyConfig(DecoderURI)

declare module "../../HKT" {
  interface ConfigType<E, A> {
    [DecoderURI]: Validate<A>
  }
  interface URItoKind<R, E, A> {
    [DecoderURI]: (env: R) => DecoderType<A>
  }
}

export class DecoderType<A> {
  _A!: A
  _URI!: DecoderURI
  constructor(public decoder: Validate<A>) {}
}
