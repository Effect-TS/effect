import * as React from "react";
import { effect as T, freeEnv as F } from "@matechs/effect";
import * as R from "../../lib";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { summon } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType } from "morphic-ts/lib/usage/utils";
import { isDone } from "@matechs/effect/lib/exit";
import { none, some, isSome } from "fp-ts/lib/Option";
import { flow } from "fp-ts/lib/function";

// alpha
/* istanbul ignore file */

const AppState = summon(F =>
  F.interface(
    {
      date: F.date(),
      todo: F.nullable(F.unknown()),
      error: F.nullable(F.string())
    },
    "AppState"
  )
);

type AppState = AType<typeof AppState>;

const accessDate = R.accessSM((s: AppState) => T.pure(s.date));

const initialState = (): AppState =>
  AppState.build({
    date: new Date(),
    todo: none,
    error: none
  });

const dateOpsURI = Symbol();

interface DateOps extends F.ModuleShape<DateOps> {
  [dateOpsURI]: {
    updateDate: T.UIO<void>;
  };
}

const dateOpsSpec = F.define<DateOps>({
  [dateOpsURI]: {
    updateDate: F.cn()
  }
});

const dateOps = F.implement(dateOpsSpec)({
  [dateOpsURI]: {
    updateDate: T.asUnit(
      R.updateS(AppState.lenseFromPath(["date"]).modify(() => new Date()))
    )
  }
});

const { updateDate } = F.access(dateOpsSpec)[dateOpsURI];

const APP = R.app<DateOps>()(initialState, AppState.type);

const buttonC = Do(T.effect)
  .sequenceS({
    dispatcher: APP.dispatcher
  })
  .return(
    ({ dispatcher }): React.FC => () => (
      <button
        onClick={() => {
          dispatcher(updateDate);
        }}
      >
        Click!
      </button>
    )
  );

const fetchJSON = pipe(
  T.result(
    T.delay(
      T.fromPromise(() =>
        fetch("http://echo.jsontest.com/key/value/one/two").then(r => r.json())
      ),
      3000
    )
  ),
  T.chain(res =>
    isDone(res)
      ? R.updateS(
          flow(
            AppState.lenseFromProp("todo").set(some(res.value)),
            AppState.lenseFromProp("error").set(none)
          )
        )
      : R.updateS(
          AppState.lenseFromProp("error").set(some("error while fetching"))
        )
  )
);

const fetchC = Do(T.effect)
  .sequenceS({
    dispatcher: APP.dispatcher
  })
  .return(
    ({ dispatcher }): React.FC => () => (
      <button
        onClick={() => {
          dispatcher(fetchJSON);
        }}
      >
        Fetch!
      </button>
    )
  );

const dateC = Do(T.effect)
  .sequenceS({
    date: accessDate
  })
  .return(({ date }): React.FC => () => <div>{date.toISOString()}</div>);

const Inp = React.memo(() => <input type={"text"} />);

const home = Do(T.effect)
  .sequenceS({
    Date: dateC,
    Button: buttonC,
    Fetch: fetchC
  })
  .return(
    ({ Date, Button, Fetch }): React.FC<{ state: AppState }> => p => (
      <>
        <Date />
        <Button />
        <Fetch />
        {isSome(p.state.todo) && (
          <div>{JSON.stringify(p.state.todo.value)}</div>
        )}
        {isSome(p.state.error) && <div>{p.state.error.value}</div>}
        <Inp />
      </>
    )
  );

// tslint:disable-next-line: no-default-export
export default APP.page(pipe(home, dateOps));
