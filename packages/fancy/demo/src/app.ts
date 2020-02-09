import * as R from "../../lib";
import * as DT from "../modules/date/state";
import * as O from "../modules/orgs/state";
import { dateModule } from "../modules/date";
import { orgsModule } from "../modules/orgs";

// alpha
/* istanbul ignore file */

export const App = R.app({
  date: DT.DateState.type,
  orgs: O.OrgsState.type
})({
  date: DT.initialState,
  orgs: O.initialState
});

export const DATE = dateModule(App, "date");
export const ORGS = orgsModule(App, "orgs");
