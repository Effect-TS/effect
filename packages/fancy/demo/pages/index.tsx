import { pipe } from "fp-ts/lib/pipeable";
import * as R from "../../lib";
import { DT } from "../modules/date";
import { dateStateURI } from "../modules/date/state";
import { ORG } from "../modules/orgs";
import { orgsStateURI } from "../modules/orgs/state";
import { Home } from "../view/Home";
import { flashInitialState, flashStateURI } from "../modules/flash/state";
import { effect as T } from "@matechs/effect";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default R.page(pipe(Home, ORG.provide, DT.provide))({
  [dateStateURI]: DT.initial,
  [orgsStateURI]: ORG.initial,
  [flashStateURI]: flashInitialState
})(
  T.pure({
    foo: "ok"
  })
);
