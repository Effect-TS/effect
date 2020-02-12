import { pipe } from "fp-ts/lib/pipeable";
import * as R from "../../lib";
import { DT } from "../modules/date";
import { dateStateURI } from "../modules/date/state";
import { ORG } from "../modules/orgs";
import { orgsStateURI } from "../modules/orgs/state";
import { Home } from "../view/Home";
import {
  flashInitialState,
  flashStateURI,
  FlashState
} from "../modules/flash/state";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default R.page(pipe(Home, ORG.provide, DT.provide))({
  [dateStateURI]: DT.initial,
  [orgsStateURI]: ORG.initial,
  [flashStateURI]: flashInitialState
})({
  [dateStateURI]: DT.DateState.type,
  [orgsStateURI]: ORG.OrgsState.type,
  [flashStateURI]: FlashState.type
})({
  foo: "ok"
});
