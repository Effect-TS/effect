import { DecoderURI, primitivesDecoder } from "./decoder"
import { PrimitivesAsyncKF, PrimitivesAsyncURI } from "./primitivesAsync"
import { AsyncStackF, AsyncStackK, makeInterpreter } from "./utils"

import { URIS } from "@matechs/preview/_abstract/HKT"

export function primitivesAsyncDecoder<F extends URIS>(
  F: AsyncStackK<F>
): PrimitivesAsyncKF<DecoderURI, F>
export function primitivesAsyncDecoder<F>(
  F: AsyncStackF<F>
): PrimitivesAsyncKF<DecoderURI, F> {
  return makeInterpreter<PrimitivesAsyncURI, DecoderURI, F>()({
    asyncString: (c) => {
      return primitivesDecoder(F).string(c as any)
    }
  })
}
