import { effect as T, freeEnv as F } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { accessDate, updateDate } from "./date";
import { App } from "./app";
import { summon, AsOpaque } from "morphic-ts/lib/batteries/summoner-no-union";
import { AType, EType } from "morphic-ts/lib/usage/utils";

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

const updateOrgs_ = (res: any[]) =>
  App.accessS(["orgs"])(({ orgs }) => {
    orgs.found = O.some(`found ${res.length}`);
    return orgs.found;
  });

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
          : App.accessS(["orgs"])(({ orgs }) => {
              orgs.error = O.some("error while fetching");
              return O.none;
            })
      )
    )
  }
});

export const { updateOrgs } = F.access(orgsOpsSpec)[orgsOpsURI];

export const OrgsState_ = summon(F =>
  F.interface(
    {
      found: F.nullable(F.string()),
      error: F.nullable(F.string())
    },
    "OrgsState"
  )
);

export interface OrgsState extends AType<typeof OrgsState_> {}
export interface OrgsStateR extends EType<typeof OrgsState_> {}
export const OrgsState = AsOpaque<OrgsStateR, OrgsState>(OrgsState_);
