import * as R from "../../lib";
import * as DT from "./date";
import * as ORGS from "./orgs";

// alpha
/* istanbul ignore file */

export const App = R.app({
  date: DT.DateState.type,
  orgs: ORGS.OrgsState.type
})({
  date: DT.initialState,
  orgs: ORGS.initialState
});
