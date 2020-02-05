import * as React from "react";
import { effect as T } from "@matechs/effect";
import { App } from "../src/app";
import { AppActions } from "../src/actions";

// alpha
/* istanbul ignore file */

export const UpdateDate = App.view(run =>
  T.pure(() => (
    <button
      onClick={() => {
        App.dispatch(run)(AppActions.of.UpdateDate({}));
      }}
    >
      Update Date!
    </button>
  ))
);
