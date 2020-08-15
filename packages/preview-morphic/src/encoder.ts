import { MoKind, MoHKT } from "./utils"

import { URIS } from "@matechs/preview/_abstract/HKT"

export const EncoderURI = "EncoderURI"
export type EncoderURI = typeof EncoderURI

export interface Encoder<F extends URIS, O, E> {
  encode: (i: O) => MoKind<F, never, E>
}

export interface EncoderF<F, O, E> {
  encode: (i: O) => MoHKT<F, never, E>
}

declare module "./registry" {
  export interface URItoInterpreter<F extends URIS, O, E> {
    [EncoderURI]: Encoder<F, O, E>
  }

  export interface URItoInterpreterF<F, O, E> {
    [EncoderURI]: EncoderF<F, O, E>
  }
}
