import * as React from "react";
import { effect as T } from "@matechs/effect";
import { generic } from "../../../lib";
import { DateOps, updateDate } from "./def";
import { useInterval } from "../../hooks/useInterval";
import { dateS, dateSURI } from "./state";
import * as M from "mobx";

// alpha
/* istanbul ignore file */

export const UpdateDate = generic([dateS])(App =>
  App.ui.withRun<DateOps>(run =>
    T.pure(() => (
      <button
        onClick={() => {
          run(updateDate);
        }}
      >
        Update Date!
      </button>
    ))
  )
);

const ShowDateComponent: React.FC<{ current: Date; foo: string }> = React.memo(
  ({ current }) => {
    const [s, setS] = React.useState(0);
    useInterval(() => {
      setS(s + 1);
    }, 500);
    return <div>{`${current.toISOString()} - ${s}`}</div>;
  }
);

export const ShowDate = generic([dateS])(App =>
  App.ui.of(
    App.withStateP([dateSURI])<{ foo: string }>()(
      T.pure(({ [dateSURI]: date, foo }) => (
        <ShowDateComponent {...date} foo={foo} />
      ))
    )
  )
);

export const LogDate = generic([dateS])(App =>
  App.ui.of(
    App.withState([dateSURI])(
      T.pure(({ [dateSURI]: date }) => {
        React.useEffect(
          () =>
            M.autorun(() => {
              console.log(date.current);
            }),
          []
        );
        return <></>;
      })
    )
  )
);
