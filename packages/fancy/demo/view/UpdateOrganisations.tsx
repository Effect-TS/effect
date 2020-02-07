import { App } from "../src/app";
import { AppActions } from "../src/actions";
import { effect as T } from "@matechs/effect";

// alpha
/* istanbul ignore file */

export const UpdateOrganisations = App.ui.withRun()(run =>
  T.pure(() => (
    <button
      onClick={() => {
        run(App.dispatch(AppActions.of.UpdateOrganisations({})));
      }}
    >
      Fetch!
    </button>
  ))
);
