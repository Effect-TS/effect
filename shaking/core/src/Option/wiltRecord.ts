import type { Separated } from "fp-ts/lib/Compactable"
import type { Option } from "fp-ts/lib/Option"

import { Either } from "../Either"
import { record } from "../Record"

import { option } from "./instances"

export const wiltRecord: <A, B, C>(
  f: (a: A) => Option<Either<B, C>>
) => (
  wa: Record<string, A>
) => Option<Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  record.wilt(option)(wa, f)
