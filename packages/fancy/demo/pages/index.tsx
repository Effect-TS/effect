import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import * as DT from "../src/date";
import * as ORGS from "../src/orgs";
import { Home } from "../view/Home";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Home, ORGS.provideOrgsOps, DT.provideDateOps));
