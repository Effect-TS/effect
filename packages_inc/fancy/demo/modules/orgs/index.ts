import { updateOrgs } from "./def"
import { provideOrgsOps } from "./orgs"
import { initialState, OrgsState } from "./state"
import { ShowOrgs, UpdateOrganisations } from "./views"

export const ORG = {
  updateOrgs,
  UpdateOrganisations,
  ShowOrgs,
  provide: provideOrgsOps,
  initial: initialState,
  OrgsState
}
