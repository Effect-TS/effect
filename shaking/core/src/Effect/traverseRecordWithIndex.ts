import { record } from "fp-ts/lib/Record"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseRecordWithIndex_ = record.traverseWithIndex(effect)

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  traverseRecordWithIndex_(ta, f)
