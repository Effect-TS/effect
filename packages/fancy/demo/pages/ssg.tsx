import { pipe } from "fp-ts/lib/pipeable";
import * as R from "../../lib";
import { DT } from "../modules/date";
import { dateStateURI } from "../modules/date/state";
import { ORG } from "../modules/orgs";
import { orgsStateURI } from "../modules/orgs/state";
import { Home } from "../view/Home";
import { flashInitialState, flashStateURI } from "../modules/flash/state";
import { effect as T } from "@matechs/effect";
import { DateOps } from "../modules/date/def";
import { OrgsOps } from "../modules/orgs/def";

// alpha
/* istanbul ignore file */

const provider = <R, E, A>(eff: T.Effect<R & DateOps & OrgsOps, E, A>) =>
  pipe(eff, ORG.provide, DT.provide);

const SSG = R.pageSSG(pipe(Home, provider))({
  [dateStateURI]: DT.initial,
  [orgsStateURI]: ORG.initial,
  [flashStateURI]: flashInitialState
})(
  // in ssg initial props can be generated via async too 
  T.pure({
    foo: "ok-foo",
    bar: "ok-bar"
  })
);

export function unstable_getStaticProps() {
  return SSG.getStaticProps();
}

// tslint:disable-next-line: no-default-export
export default SSG.page;
