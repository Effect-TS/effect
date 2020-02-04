import * as React from "react";
import { effect as T, freeEnv as F } from "@matechs/effect";
import * as R from "../../lib";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { summon } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType } from "morphic-ts/lib/usage/utils";
import { isDone } from "@matechs/effect/lib/exit";
import { none, some } from "fp-ts/lib/Option";

// alpha
/* istanbul ignore file */

const AppState = summon(F =>
  F.interface(
    {
      date: F.date(),
      todo: F.nullable(F.unknown())
    },
    "AppState"
  )
);

type AppState = AType<typeof AppState>;

const accessDate = R.accessSM((s: AppState) => T.pure(s.date));

const initialState = (): AppState =>
  AppState.build({
    date: new Date(),
    todo: none
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
      ? T.asUnit(
          R.updateS(
            AppState.lenseFromProp("todo").modify(() => some(res.value))
          )
        )
      : T.sync(() => {
          console.error(res);
        })
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

const home = Do(T.effect)
  .sequenceS({
    Date: dateC,
    Button: buttonC,
    Fetch: fetchC,
    todos: R.accessS(AppState.lenseFromProp("todo").get)
  })
  .return(
    ({ Date, Button, Fetch, todos }): React.FC => () => (
      <>
        <Date />
        <Button />
        <Fetch />
        <div>{JSON.stringify(todos)}</div>
      </>
    )
  );

// tslint:disable-next-line: no-default-export
export default APP.page(pipe(home, dateOps));
