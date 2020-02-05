import { effect as T } from "@matechs/effect";
import { App } from "../src/app";
import { AppActions } from "../src/actions";

// alpha
/* istanbul ignore file */

export const UpdateOrganisations = App.view(run =>
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
