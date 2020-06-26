import { unfold_ } from "./unfold_"

/**
 * A schedule that recurs forever, producing a count of repeats: 0, 1, 2, ...
 */
export const forever =
  /*#__PURE__*/
  unfold_(0, (n) => n + 1)
