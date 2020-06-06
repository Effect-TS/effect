import * as R from "../../../src"

import { dateOpsSpec, dateOpsURI } from "./def"
import { DateStateEnv, dateStateURI } from "./state"

import * as F from "@matechs/core/Service"
import { mutable } from "@matechs/core/Utils"

// alpha
/* istanbul ignore file */

export const provideDateOps = F.implement(dateOpsSpec)({
  [dateOpsURI]: {
    updateDate: R.accessS<DateStateEnv>()(({ [dateStateURI]: date }) => {
      mutable(date).current = new Date()
      return date.current
    }),
    accessDate: R.accessS<DateStateEnv>()(({ [dateStateURI]: date }) => date.current)
  }
})
