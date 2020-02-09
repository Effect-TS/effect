import { App } from "../../../lib";
import { updateOrgs } from "./def";
import { provideOrgsOps } from "./orgs";
import { OrgsState } from "./state";
import { UpdateOrganisations, ShowOrgs } from "./views";

export function orgsModule<
  URI extends string & keyof S,
  S extends { [k in URI]: OrgsState }
>(App: App<S>, URI: URI) {
  return {
    updateOrgs,
    UpdateOrganisations: UpdateOrganisations(App),
    ShowOrgs: ShowOrgs(App, URI),
    provide: provideOrgsOps(App, URI)
  };
}

export { OrgsState, initialState } from "./state";
