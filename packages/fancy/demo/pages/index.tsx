import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import * as DT from "../modules/date/date";
import * as ORGS from "../modules/orgs/orgs";
import { Home } from "../view/Home";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default App.page(
  pipe(Home, ORGS.provideOrgsOps(App, "orgs"), DT.provideDateOps(App, "date"))
);
