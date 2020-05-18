import { Sync } from "../Support/Common/effect"

import { pure } from "./pure"

/**
 * An IO that succeeds immediately with void
 */
export const unit: Sync<void> =
  /*#__PURE__*/
  (() => pure(undefined))()
