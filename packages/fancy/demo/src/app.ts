import * as O from "fp-ts/lib/Option";
import * as R from "../../lib";
import { DateOps, updateDate } from "./date";
import { AppState } from "./state";
import { AppActions } from "./actions";
import { updateOrgs } from "./orgs";
import { pipe } from "fp-ts/lib/pipeable";
import { effect as T } from "@matechs/effect";

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
  R.matcher(AppActions)({
    UpdateDate: () => updateDate,
    UpdateOrganisations: () =>
      pipe(
        updateOrgs,
        T.chain(_ => R.cont(AppActions.type)(AppActions.of.UpdateDate({})))
      )
  })
);
