import { sequenceS as SS } from "../Apply"

import { parManaged } from "./managed"

export const parSequenceS =
  /*#__PURE__*/
  (() => SS(parManaged))()
