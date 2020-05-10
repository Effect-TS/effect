import { record } from "fp-ts/lib/Record"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(parFastEffect)(ta, f)
