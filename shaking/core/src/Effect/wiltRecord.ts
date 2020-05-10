import { Separated } from "fp-ts/lib/Compactable"
import { Either } from "fp-ts/lib/Either"
import { record } from "fp-ts/lib/Record"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => Effect<S, R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(effect)(wa, f)
