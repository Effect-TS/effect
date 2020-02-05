import * as O from "fp-ts/lib/Option";
import * as R from "../../lib";
import * as S from "./state";
import { DateOps } from "./date";

// alpha
/* istanbul ignore file */

// alpha
/* istanbul ignore file */

const initialState = (): S.AppState =>
  S.AppState.build({
    date: new Date(),
    orgs: O.none,
    error: O.none
  });

export const App = R.app<DateOps>()(initialState, S.AppState.type);
