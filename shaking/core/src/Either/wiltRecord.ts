import type { Separated } from "fp-ts/lib/Compactable"

import { record } from "../Record"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const wiltRecord_ = record.wilt(eitherMonad)

export const wiltRecord: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (
  wa: Record<string, A>
) => Either<E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  wiltRecord_(wa, f)
