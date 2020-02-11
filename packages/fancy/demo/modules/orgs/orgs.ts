import { effect as T, freeEnv as F } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "../../../lib";
import { orgsOpsSpec, orgsOpsURI } from "./def";
import { updateDate } from "../date/def";
import { OrgsStateEnv, orgsStateURI } from "./state";

// alpha
/* istanbul ignore file */

const updateOrgs_ = (res: any[]) =>
  R.accessS<OrgsStateEnv>()(({ [orgsStateURI]: orgs }) => {
    orgs.found = O.some(`found ${res.length}`);
    return orgs.found;
  });

const fetchOrgs = T.result(
  T.fromPromise(() =>
    fetch("https://api.github.com/users/hadley/orgs").then(r => r.json())
  )
);

export const provideOrgsOps = F.implement(orgsOpsSpec)({
  [orgsOpsURI]: {
    updateOrgs: pipe(
      fetchOrgs,
      T.chain(res =>
        isDone(res)
          ? pipe(
              updateOrgs_(res.value),
              T.chainTap(_ => updateDate)
            )
          : R.accessS<OrgsStateEnv>()(({ [orgsStateURI]: orgs }) => {
              orgs.error = O.some("error while fetching");
              return O.none;
            })
      )
    )
  }
});
