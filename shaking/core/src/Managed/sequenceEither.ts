import { sequence } from "../Either"

import { managed } from "./managed"

export const sequenceEither =
  /*#__PURE__*/
  (() => sequence(managed))()
