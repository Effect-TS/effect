import { effect as T } from "@matechs/effect";
import { App } from "../../../lib";
import { OrgsOps, updateOrgs } from "./spec";

// alpha
/* istanbul ignore file */

export function UpdateOrganisations<S>(App: App<S>) {
  return App.ui.withRun<OrgsOps>()(run =>
    T.pure(() => (
      <button
        onClick={() => {
          run(updateOrgs);
        }}
      >
        Fetch!
      </button>
    ))
  );
}
