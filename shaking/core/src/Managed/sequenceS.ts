import { sequenceS as SS } from "../Apply"

import { managed } from "./managed"

export const sequenceS =
  /*#__PURE__*/
  (() => SS(managed))()
