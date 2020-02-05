import { effect as T } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import { flow } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "../../lib";
import * as S from "./state";

// alpha
/* istanbul ignore file */

const fetchOrgs = T.result(
  T.fromPromise(() =>
    fetch("https://api.github.com/users/hadley/orgs").then(r => r.json())
  )
);

export const updateOrgs = pipe(
  fetchOrgs,
  T.chain(res =>
    isDone(res)
      ? R.updateS(flow(S.orgsL.set(O.some(res.value)), S.errorL.set(O.none)))
      : R.updateS(S.errorL.set(O.some("error while fetching")))
  )
);
