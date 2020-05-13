import { Option } from "../Option"
import { record } from "../Record"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parWitherRecord_ = record.wither(parEffect)

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  parWitherRecord_(ta, f)
