import { updateOrgs } from "./def";
import { provideOrgsOps } from "./orgs";
import { ShowOrgs, UpdateOrganisations } from "./views";
import { initialState, OrgsState } from "./state";

export const ORG = {
  updateOrgs,
  UpdateOrganisations,
  ShowOrgs,
  provide: provideOrgsOps,
  initial: initialState,
  OrgsState
};
