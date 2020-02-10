import * as R from "../../lib";
import * as DT from "../modules/date/state";
import * as O from "../modules/orgs/state";
import { dateModule } from "../modules/date";
import { orgsModule } from "../modules/orgs";

// alpha
/* istanbul ignore file */

export const App = R.app(R.merge([DT.dateS, O.orgsS]))({
  [DT.dateSURI]: DT.initialState,
  [O.orgsSURI]: O.initialState
});

export const DATE = dateModule(App);
export const ORGS = orgsModule(App);
