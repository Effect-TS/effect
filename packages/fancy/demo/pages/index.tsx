import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import * as DT from "../src/date";
import * as ORGS from "../src/orgs";
import { Home } from "../view/Home";
import { AppState } from "../src/state";
import * as O from "fp-ts/lib/Option";

// alpha
/* istanbul ignore file */

const initialState = (): AppState =>
  AppState.build({
    date: new Date(),
    orgs: O.none,
    error: O.none
  });

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Home, ORGS.provideOrgsOps, DT.provideDateOps))(
  initialState
);
