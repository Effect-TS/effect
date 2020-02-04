import * as React from "react";
import { effect as T, freeEnv as F } from "@matechs/effect";
import * as R from "../../lib";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { summon } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType } from "morphic-ts/lib/usage/utils";

// alpha
/* istanbul ignore file */

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

const dateC = Do(T.effect)
  .sequenceS({
    date: accessDate
  })
  .return(({ date }): React.FC => () => <div>{date.toISOString()}</div>);

const home = Do(T.effect)
  .sequenceS({
    Date: dateC,
    Button: buttonC
  })
  .return(
    ({ Date, Button }): React.FC => () => (
      <>
        <Date />
        <Button />
      </>
    )
  );

// tslint:disable-next-line: no-default-export
export default APP.page(pipe(home, dateOps));
