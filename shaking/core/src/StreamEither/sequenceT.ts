import { sequenceT as ST } from "../Apply"

import { streamEither } from "./streamEither"

export const sequenceT =
  /*#__PURE__*/
  (() => ST(streamEither))()
