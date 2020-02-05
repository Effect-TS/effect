import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import * as DT from "../src/date";
import { Home } from "../view/Home";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Home, DT.provideDateOps));