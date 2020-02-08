import * as R from "../../lib";
import * as DT from "../modules/date/state";
import * as ORGS from "../modules/orgs/state";

// alpha
/* istanbul ignore file */

export const App = R.app({
  date: DT.DateState.type,
  orgs: ORGS.OrgsState.type
})({
  date: DT.initialState,
  orgs: ORGS.initialState
});
