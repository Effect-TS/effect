import { effect as T } from "@matechs/effect";
import { App } from "../src/app";
import * as ORGS from "../src/orgs"

// alpha
/* istanbul ignore file */

export const Fetch = App.view(dispatch =>
  T.pure(() => (
    <button
      onClick={() => {
        dispatch(ORGS.updateOrgs);
      }}
    >
      Fetch!
    </button>
  ))
);
