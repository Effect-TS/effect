import { App } from "../src/app";
import { AppActions } from "../src/actions";

// alpha
/* istanbul ignore file */

export const UpdateOrganisations = App.pureUI(run => () => (
  <button
    onClick={() => {
      run(App.dispatch(AppActions.of.UpdateOrganisations({})));
    }}
  >
    Fetch!
  </button>
));
