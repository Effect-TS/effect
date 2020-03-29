import { freeEnv as F } from "@matechs/effect";
import * as R from "../../../lib";
import { dateOpsSpec, dateOpsURI } from "./def";
import { DateStateEnv, dateStateURI } from "./state";

// alpha
/* istanbul ignore file */

export const provideDateOps = F.implement(dateOpsSpec)({
  [dateOpsURI]: {
    updateDate: R.accessS<DateStateEnv>()(({ [dateStateURI]: date }) => {
      date.current = new Date();
      return date.current;
    }),
    accessDate: R.accessS<DateStateEnv>()(
      ({ [dateStateURI]: date }) => date.current
    )
  }
});
