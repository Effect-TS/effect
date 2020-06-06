import * as R from "../../../src"
import { updateDate } from "../date/def"
import { flashMessage } from "../flash/flash"

import { orgsOpsSpec, orgsOpsURI } from "./def"
import { OrgsStateEnv, orgsStateURI } from "./state"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as F from "@matechs/core/Service"
import { mutable } from "@matechs/core/Utils"

// alpha
/* istanbul ignore file */

const updateOrgs_ = (res: any[]) =>
  R.accessS<OrgsStateEnv>()(({ [orgsStateURI]: orgs }) => {
    mutable(orgs).found = O.some(`found ${res.length}`)

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
              mutable(orgs).error = O.some("error while fetching")
              return O.none
            })
      )
    )
  }
})
