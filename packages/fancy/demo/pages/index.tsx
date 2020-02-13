import { pipe } from "fp-ts/lib/pipeable";
import * as R from "../../lib";
import { DT } from "../modules/date";
import { dateStateURI } from "../modules/date/state";
import { ORG } from "../modules/orgs";
import { orgsStateURI } from "../modules/orgs/state";
import { Home } from "../view/Home";
import { flashInitialState, flashStateURI } from "../modules/flash/state";
import { effect as T, freeEnv as F } from "@matechs/effect";
import { DateOps } from "../modules/date/def";
import { OrgsOps } from "../modules/orgs/def";

// alpha
/* istanbul ignore file */

const provider = <R, E, A>(eff: T.Effect<R & DateOps & OrgsOps, E, A>) =>
  pipe(eff, ORG.provide, DT.provide);

// tslint:disable-next-line: no-default-export
export default R.page(pipe(Home, provider))({
  [dateStateURI]: DT.initial,
  [orgsStateURI]: ORG.initial,
  [flashStateURI]: flashInitialState
})(
  T.pure({
    foo: "ok"
  }),
  // if static then initial props effect must be sync, page will be rendered
  // as static html, if ssr the props effect can be any async or sync
  // in case of ssr mode NextContext will be embedded (via getInitialProps)
  "static"
);
