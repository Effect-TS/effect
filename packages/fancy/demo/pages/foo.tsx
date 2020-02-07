import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import * as DT from "../src/date";
import * as ORGS from "../src/orgs";
import { Foo } from "../view/Foo";
import { AppState } from "../src/state";
import * as O from "fp-ts/lib/Option";
import { effect as T } from "@matechs/effect";

// alpha
/* istanbul ignore file */

const initialState = T.pure(
  AppState.build({
    date: new Date(),
    orgs: O.none,
    error: O.none
  })
);

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Foo, ORGS.provideOrgsOps, DT.provideDateOps))(
  initialState
);
