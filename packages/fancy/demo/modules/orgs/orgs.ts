import { effect as T, freeEnv as F } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { App as GenApp } from "../../../lib";
import { orgsOpsSpec, orgsOpsURI } from "./spec";
import { OrgsState } from "./state";
import { updateDate } from "../date/spec";

// alpha
/* istanbul ignore file */

export function provideOrgsOps<
  K extends string & keyof S,
  S extends { [k in K]: OrgsState }
>(APP: GenApp<S>, OrgsStateURI: K) {
  const updateOrgs_ = (res: any[]) =>
    APP.accessS([OrgsStateURI])(({ [OrgsStateURI]: orgs }) => {
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
            : APP.accessS([OrgsStateURI])(({ [OrgsStateURI]: orgs }) => {
                orgs.error = O.some("error while fetching");
                return O.none;
              })
        )
      )
    }
  });
}
