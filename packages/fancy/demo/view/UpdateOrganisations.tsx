import { App } from "../src/app";
import { effect as T } from "@matechs/effect";
import { updateOrgs, OrgsOps } from "../src/orgs";

// alpha
/* istanbul ignore file */

export const UpdateOrganisations = App.ui.withRun<OrgsOps>()(run =>
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
