import { record } from "fp-ts/lib/Record"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  record.traverse(effect)(ta, f)
