import { T, Service as F, Ex, O, pipe } from "@matechs/prelude"

import * as R from "../../../src"
import { updateDate } from "../date/def"
import { flashMessage } from "../flash/flash"

import { orgsOpsSpec, orgsOpsURI } from "./def"
import { OrgsStateEnv, orgsStateURI } from "./state"

// alpha
/* istanbul ignore file */

const updateOrgs_ = (res: any[]) =>
  R.accessS<OrgsStateEnv>()(({ [orgsStateURI]: orgs }) => {
    orgs.found = O.some(`found ${res.length}`)
    return orgs.found
  })

const fetchOrgs = T.result(
  T.fromPromise(() =>
    fetch("https://api.github.com/users/hadley/orgs").then((r) => r.json())
  )
)

export const provideOrgsOps = F.implement(orgsOpsSpec)({
  [orgsOpsURI]: {
    updateOrgs: pipe(
      fetchOrgs,
      T.chain((res) =>
        Ex.isDone(res)
          ? pipe(
              updateOrgs_(res.value),
              T.chainTap((_) => updateDate),
              T.chainTap((_) => flashMessage("fetched!"))
            )
          : R.accessS<OrgsStateEnv>()(({ [orgsStateURI]: orgs }) => {
              orgs.error = O.some("error while fetching")
              return O.none
            })
      )
    )
  }
})
