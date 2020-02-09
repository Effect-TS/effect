import { pipe } from "fp-ts/lib/pipeable";
import { App, ORGS, DATE } from "../src/app";
import { Home } from "../view/Home";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Home, ORGS.provide, DATE.provide));
