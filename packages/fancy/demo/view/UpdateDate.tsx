import * as React from "react";
import { App } from "../src/app";
import { AppActions } from "../src/actions";

// alpha
/* istanbul ignore file */

export const UpdateDate = App.pureUI(run => () => (
  <button
    onClick={() => {
      run(App.dispatch(AppActions.of.UpdateDate({})));
    }}
  >
    Update Date!
  </button>
));
