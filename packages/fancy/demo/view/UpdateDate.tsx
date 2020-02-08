import { effect as T } from "@matechs/effect";
import * as React from "react";
import { App } from "../src/app";
import { updateDate, DateOps } from "../src/date";

// alpha
/* istanbul ignore file */

export const UpdateDate = App.ui.withRun<DateOps>()(run =>
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
