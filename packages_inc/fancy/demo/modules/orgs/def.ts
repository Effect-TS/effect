import { T, Service as F, O } from "@matechs/prelude"

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
