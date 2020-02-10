import { generic } from "../../../lib";
import { updateOrgs } from "./def";
import { provideOrgsOps } from "./orgs";
import { orgsS } from "./state";
import { UpdateOrganisations, ShowOrgs } from "./views";

export const orgsModule = generic([orgsS])(App => ({
  updateOrgs,
  UpdateOrganisations: UpdateOrganisations(App),
  ShowOrgs: ShowOrgs(App),
  provide: provideOrgsOps(App)
}));

export { OrgsState, initialState } from "./state";
