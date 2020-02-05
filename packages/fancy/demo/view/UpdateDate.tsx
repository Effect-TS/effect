import * as React from "react";
import { effect as T } from "@matechs/effect";
import { App } from "../src/app";
import * as DT from "../src/date";

// alpha
/* istanbul ignore file */

export const UpdateDate = App.view(dispatch =>
  T.pure(() => (
    <button
      onClick={() => {
        dispatch(DT.updateDate, date => {
          console.log("new date", date.date);
        });
      }}
    >
      Update Date!
    </button>
  ))
);
