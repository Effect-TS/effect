import { freeEnv as F } from "@matechs/effect";
import { App } from "../../../lib";
import { dateOpsSpec, dateOpsURI } from "./def";
import { DateState } from "./state";

// alpha
/* istanbul ignore file */

export const provideDateOps = <
  URI extends string & keyof S,
  S extends { [k in URI]: DateState }
>(
  App: App<S>,
  dateURI: URI
) =>
  F.implement(dateOpsSpec)({
    [dateOpsURI]: {
      updateDate: App.accessS([dateURI])(({ [dateURI]: date }) => {
        date.current = new Date();
        return date.current;
      }),
      accessDate: App.accessS([dateURI])(({ [dateURI]: date }) => date.current)
    }
  });
