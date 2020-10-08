import * as T from "@effect-ts/core/Classic/Sync"
import { mapError } from "@effect-ts/core/Classic/Sync"
import { flow } from "@effect-ts/core/Function"

import type { M } from "../Batteries/summoner"
import { decoder, report } from "../Decoder"
import type { Decoder } from "../Decoder/hkt"
import { strict } from "../Strict"

function strictDecoder_<E, A>(F: M<{}, E, A>): Decoder<A> {
  return {
    decode: flow(decoder(F).decode, T.chain(strict(F).shrink))
  }
}

const decoders = new Map<any, any>()

export function strictDecoder<E, A>(F: M<{}, E, A>): Decoder<A> {
  if (decoders.has(F)) {
    return decoders.get(F)
  }
  const d = strictDecoder_(F)
  decoders.set(F, d)
  return d
}

export function decodeStrictReport<E, A>(F: M<{}, E, A>) {
  return flow(decoder(F).decode, mapError(report))
}
