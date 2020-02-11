import * as R from "../../lib";
import * as DT from "../modules/date/state";
import * as O from "../modules/orgs/state";

// alpha
/* istanbul ignore file */

export const App = R.app(R.merge([DT.dateS, O.orgsS]))({
  [DT.dateSURI]: DT.initialState,
  [O.orgsSURI]: O.initialState
});
