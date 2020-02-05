import { effect as T } from "@matechs/effect";
import { App } from "../src/app";
import * as ORGS from "../src/orgs"

// alpha
/* istanbul ignore file */

export const Fetch = App.view(run =>
  T.pure(() => (
    <button
      onClick={() => {
        run(ORGS.updateOrgs);
      }}
    >
      Fetch!
    </button>
  ))
);
