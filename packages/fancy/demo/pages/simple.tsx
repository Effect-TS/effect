import { pipe } from "fp-ts/lib/pipeable";
import * as R from "../../lib";
import { DT } from "../modules/date";
import { dateStateURI } from "../modules/date/state";
import { ORG } from "../modules/orgs";
import { orgsStateURI } from "../modules/orgs/state";
import { Home } from "../view/Home";
import { flashInitialState, flashStateURI } from "../modules/flash/state";
import { effect as T } from "@matechs/effect";

// This is a plain component, it will render an empty fragment or the
// provided fallback child and replace the it with the rendered
// component once async rendering has finished ("suspence like")
const HomeComponent = R.component(
  pipe(
    R.accessP((_: { foo: string }) => _.foo),
    T.chain(foo =>
      pipe(
        Home,
        T.map(C => () => (
          <>
            <div>{foo}</div>
            <C />
          </>
        ))
      )
    ),
    ORG.provide,
    DT.provide
  )
)({
  [dateStateURI]: DT.initial,
  [orgsStateURI]: ORG.initial,
  [flashStateURI]: flashInitialState
});

// tslint:disable-next-line: no-default-export
export default () => (
  <HomeComponent foo={"ok"}>
    <div>FALLBACK</div>
  </HomeComponent>
);
