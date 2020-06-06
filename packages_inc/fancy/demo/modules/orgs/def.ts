import * as T from "@matechs/core/Effect"
import * as O from "@matechs/core/Option"
import * as F from "@matechs/core/Service"

// alpha
/* istanbul ignore file */

export const orgsOpsURI = Symbol()

export interface OrgsOps extends F.ModuleShape<OrgsOps> {
  [orgsOpsURI]: {
    updateOrgs: T.Async<O.Option<string>>
  }
}

export const orgsOpsSpec = F.define<OrgsOps>({
  [orgsOpsURI]: {
    updateOrgs: F.cn()
  }
})

export const { updateOrgs } = F.access(orgsOpsSpec)[orgsOpsURI]
