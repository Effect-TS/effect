import type { Separated } from "fp-ts/lib/Compactable"
import { record } from "fp-ts/lib/Record"

import type { Either } from "../Either/Either"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parWiltRecord_ = record.wilt(parEffect)

export const parWiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => AsyncRE<R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(parEffect)(wa, f)
