import { effect as T, freeEnv as F } from "@matechs/effect";
import { Option } from "fp-ts/lib/Option";

// alpha
/* istanbul ignore file */

export const orgsOpsURI = Symbol();

export interface OrgsOps extends F.ModuleShape<OrgsOps> {
  [orgsOpsURI]: {
    updateOrgs: T.UIO<Option<string>>;
  };
}

export const orgsOpsSpec = F.define<OrgsOps>({
  [orgsOpsURI]: {
    updateOrgs: F.cn()
  }
});

export const { updateOrgs } = F.access(orgsOpsSpec)[orgsOpsURI];
