import * as React from "react";
import { effect as T, freeEnv as F } from "@matechs/effect";
import * as R from "../../lib";
import { pipe } from "fp-ts/lib/pipeable";
import { summon, AsOpaque } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType, EType } from "morphic-ts/lib/usage/utils";
import { isDone } from "@matechs/effect/lib/exit";
import * as O from "fp-ts/lib/Option";
import { flow, Lazy } from "fp-ts/lib/function";
import { sequenceS } from "fp-ts/lib/Apply";

// alpha
/* istanbul ignore file */

const AppState_ = summon(F =>
  F.interface(
    {
      date: F.date(),
      orgs: F.nullable(F.array(F.unknown())),
      error: F.nullable(F.string())
    },
    "AppState"
  )
);

interface AppState extends AType<typeof AppState_> {}
interface AppStateR extends EType<typeof AppState_> {}

const AppState = AsOpaque<AppStateR, AppState>(AppState_);

const initialState = (): AppState =>
  AppState.build({
    date: new Date(),
    orgs: O.none,
    error: O.none
  });

const dateOpsURI = Symbol();

interface DateOps extends F.ModuleShape<DateOps> {
  [dateOpsURI]: {
    updateDate: T.UIO<AppState>;
  };
}

const dateOpsSpec = F.define<DateOps>({
  [dateOpsURI]: {
    updateDate: F.cn()
  }
});

const dateL = AppState.lenseFromProp("date");
const errorL = AppState.lenseFromProp("error");
const orgsL = AppState.lenseFromProp("orgs");

const dateOps = F.implement(dateOpsSpec)({
  [dateOpsURI]: {
    updateDate: R.updateS(dateL.modify(() => new Date()))
  }
});

const { updateDate } = F.access(dateOpsSpec)[dateOpsURI];

const APP = R.app<DateOps>()(initialState, AppState.type);

const UpdateDate = APP.view(dispatch =>
  T.pure(() => (
    <button
      onClick={() => {
        dispatch(updateDate);
      }}
    >
      Update Date!
    </button>
  ))
);

const fetchJSON = pipe(
  T.result(
    T.fromPromise(() =>
      fetch("https://api.github.com/users/hadley/orgs").then(r => r.json())
    )
  ),
  T.chain(res =>
    isDone(res)
      ? R.updateS(flow(orgsL.set(O.some(res.value)), errorL.set(O.none)))
      : R.updateS(errorL.set(O.some("error while fetching")))
  )
);

const Fetch = APP.view(dispatch =>
  T.pure(() => (
    <button
      onClick={() => {
        dispatch(fetchJSON);
      }}
    >
      Fetch!
    </button>
  ))
);

// example of hook interop
function useInterval(callback: Lazy<void>, delay: number) {
  const savedCallback = React.useRef<Lazy<void>>();

  // Remember the latest callback.
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      savedCallback.current!!();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const ShowDate = APP.view(() =>
  T.pure(() => {
    const [s, setS] = React.useState(0);
    const { date } = APP.useState();

    useInterval(() => {
      setS(s + 1);
    }, 500);

    return <div>{`${date.toISOString()} - ${s}`}</div>;
  })
);

const MemoInput = React.memo(() => <input type={"text"} />);

const Home = APP.view(() =>
  pipe(
    sequenceS(T.effect)({
      UpdateDate,
      Fetch,
      ShowDate
    }),
    T.map(
      ({ UpdateDate, ShowDate, Fetch }): React.FC<R.StateP<AppState>> => ({
        state
      }) => (
        <>
          <ShowDate />
          <UpdateDate />
          <Fetch />
          {pipe(
            state,
            orgsL.get,
            O.map(orgs => <div>Orgs loaded: {orgs.length}</div>),
            O.toNullable
          )}
          {pipe(
            state,
            errorL.get,
            O.map(error => <div>{error}</div>),
            O.toNullable
          )}
          <MemoInput />
        </>
      )
    )
  )
);

// tslint:disable-next-line: no-default-export
export default APP.page(pipe(Home, dateOps));
