import { effect as T, freeEnv as F } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { generic } from "../../../lib";
import { orgsOpsSpec, orgsOpsURI } from "./def";
import { orgsS, orgsSURI } from "./state";
import { updateDate } from "../date/def";

// alpha
/* istanbul ignore file */

export const provideOrgsOps = generic([orgsS])(App => {
  const updateOrgs_ = (res: any[]) =>
    App.accessS([orgsSURI])(({ [orgsSURI]: orgs }) => {
      orgs.found = O.some(`found ${res.length}`);
      return orgs.found;
    });

  const fetchOrgs = T.result(
    T.fromPromise(() =>
      fetch("https://api.github.com/users/hadley/orgs").then(r => r.json())
    )
  );

  return F.implement(orgsOpsSpec)({
    [orgsOpsURI]: {
      updateOrgs: pipe(
        fetchOrgs,
        T.chain(res =>
          isDone(res)
            ? pipe(
                updateOrgs_(res.value),
                T.chainTap(_ => updateDate)
              )
            : App.accessS([orgsSURI])(({ [orgsSURI]: orgs }) => {
                orgs.error = O.some("error while fetching");
                return O.none;
              })
        )
      )
    }
  });
});
