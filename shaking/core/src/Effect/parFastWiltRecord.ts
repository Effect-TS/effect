import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either/Either"
import { wilt_ } from "../Record"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastWiltRecord_ = wilt_(parFastEffect)

export const parFastWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => AsyncRE<R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  parFastWiltRecord_(wa, f)
