import { Service as F } from "@matechs/prelude"

import * as R from "../../../src"

import { dateOpsSpec, dateOpsURI } from "./def"
import { DateStateEnv, dateStateURI } from "./state"

// alpha
/* istanbul ignore file */

export const provideDateOps = F.implement(dateOpsSpec)({
  [dateOpsURI]: {
    updateDate: R.accessS<DateStateEnv>()(({ [dateStateURI]: date }) => {
      date.current = new Date()
      return date.current
    }),
    accessDate: R.accessS<DateStateEnv>()(({ [dateStateURI]: date }) => date.current)
  }
})
