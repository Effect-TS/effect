import { traverseWithIndex_ } from "../Record"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseRecordWithIndex_ =
  /*#__PURE__*/
  (() => traverseWithIndex_(effect))()

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  traverseRecordWithIndex_(ta, f)
