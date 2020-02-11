import { updateOrgs } from "./def";
import { provideOrgsOps } from "./orgs";
import { ShowOrgs, UpdateOrganisations } from "./views";

export const ORG = {
  updateOrgs,
  UpdateOrganisations,
  ShowOrgs,
  provide: provideOrgsOps
};

export { initialState, OrgsState } from "./state";
