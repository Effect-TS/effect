import { effect as T, freeEnv as F } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { accessDate } from "./date";
import { App } from "./app";

// alpha
/* istanbul ignore file */

const fetchOrgs = T.result(
  T.fromPromise(() =>
    fetch("https://api.github.com/users/hadley/orgs").then(r => r.json())
  )
);

export const orgsOpsURI = Symbol();

export interface OrgsOps extends F.ModuleShape<OrgsOps> {
  [orgsOpsURI]: {
    updateOrgs: T.UIO<O.Option<string>>;
  };
}

export const orgsOpsSpec = F.define<OrgsOps>({
  [orgsOpsURI]: {
    updateOrgs: F.cn()
  }
});

const updateOrgs_ = (res: any[]) => (date: Date) =>
  App.accessS(s => {
    s.orgs.found = O.some(`found ${res.length} (${date.toISOString()})`);
    s.date.current = new Date();

    return s.orgs.found;
  });

export const provideOrgsOps = F.implement(orgsOpsSpec)({
  [orgsOpsURI]: {
    updateOrgs: pipe(
      fetchOrgs,
      T.chain(res =>
        isDone(res)
          ? pipe(accessDate, T.chain(updateOrgs_(res.value)))
          : App.accessS(s => {
              s.orgs.error = O.some("error while fetching");
              return O.none;
            })
      )
    )
  }
});

export const { updateOrgs } = F.access(orgsOpsSpec)[orgsOpsURI];
