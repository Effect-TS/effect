import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import { Home } from "../view/Home";
import { ORG } from "../modules/orgs";
import { DT } from "../modules/date";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Home, ORG.provide, DT.provide));
