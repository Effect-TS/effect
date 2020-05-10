import type { Separated } from "fp-ts/lib/Compactable"
import type { Option } from "fp-ts/lib/Option"

import { array } from "../Array"
import { Either } from "../Either"

import { option } from "./instances"

export const wiltArray: <A, B, C>(
  f: (a: A) => Option<Either<B, C>>
) => (wa: Array<A>) => Option<Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(option)(wa, f)
