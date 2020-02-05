import * as O from "fp-ts/lib/Option";
import * as R from "../../lib";
import { DateOps, updateDate } from "./date";
import { AppState } from "./state";
import { AppActions } from "./actions";

// alpha
/* istanbul ignore file */

const initialState = (): AppState =>
  AppState.build({
    date: new Date(),
    orgs: O.none,
    error: O.none
  });

export const App = R.app<DateOps>()(
  initialState,
  AppState.type,
  AppActions.type,
  run =>
    AppActions.match({
      UpdateDate: () => {
        run(updateDate);
      }
    })
);
