import * as React from "react";
import { effect as T } from "@matechs/effect";
import { App } from "../../../lib";
import { DateOps, updateDate } from "./spec";
import { useInterval } from "../../hooks/useInterval";
import { DateState } from "./state";

// alpha
/* istanbul ignore file */

export function UpdateDate<S>(App: App<S>) {
  return App.ui.withRun<DateOps>()(run =>
    T.pure(() => (
      <button
        onClick={() => {
          run(updateDate);
        }}
      >
        Update Date!
      </button>
    ))
  );
}

const ShowDateComponent: React.FC<{ current: Date }> = React.memo(
  ({ current }) => {
    const [s, setS] = React.useState(0);
    useInterval(() => {
      setS(s + 1);
    }, 500);
    return <div>{`${current.toISOString()} - ${s}`}</div>;
  }
);

export function ShowDate<
  URI extends string & keyof S,
  S extends { [k in URI]: DateState }
>(App: App<S>, dateURI: URI) {
  return App.ui.of(
    App.withState([dateURI])()(
      T.pure(({ [dateURI]: date }) => <ShowDateComponent {...date} />)
    )
  );
}
