import * as React from "react";
import { effect as T, freeEnv as F } from "@matechs/effect";
import * as R from "../../lib";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { summon } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType } from "morphic-ts/lib/usage/utils";

const AppState = summon(F =>
  F.interface(
    {
      date: F.date()
    },
    "AppState"
  )
);

type AppState = AType<typeof AppState>;

const accessDate = R.accessSM((s: AppState) => T.pure(s.date));

const initialState = (): AppState =>
  AppState.build({
    date: new Date()
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

const Home = Do(T.effect)
  .sequenceS({
    dispatcher: APP.dispatcher,
    date: accessDate
  })
  .return(({ date, dispatcher }) => (
    <>
      <div>{date.toISOString()}</div>
      <button
        onClick={() => {
          dispatcher(updateDate);
        }}
      >
        Click!
      </button>
    </>
  ));

// tslint:disable-next-line: no-default-export
export default APP.page(pipe(Home, dateOps));
