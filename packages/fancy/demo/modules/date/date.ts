import { freeEnv as F } from "@matechs/effect";
import { generic } from "../../../lib";
import { dateOpsSpec, dateOpsURI } from "./def";
import { dateS, dateSURI } from "./state";

// alpha
/* istanbul ignore file */

export const provideDateOps = generic([dateS])(App =>
  F.implement(dateOpsSpec)({
    [dateOpsURI]: {
      updateDate: App.accessS([dateSURI])(({ [dateSURI]: date }) => {
        date.current = new Date();
        return date.current;
      }),
      accessDate: App.accessS([dateSURI])(
        ({ [dateSURI]: date }) => date.current
      )
    }
  })
);
