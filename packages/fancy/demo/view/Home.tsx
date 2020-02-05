import { effect as T } from "@matechs/effect";
import { sequenceS } from "fp-ts/lib/Apply";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import * as S from "../src/state";
import { UpdateOrganisations } from "./UpdateOrganisations";
import { MemoInput } from "./MemoInput";
import { ShowDate } from "./ShowDate";
import { UpdateDate } from "./UpdateDate";
import * as R from "../../lib";

// alpha
/* istanbul ignore file */

export const Home = App.view(() =>
  pipe(
    sequenceS(T.effect)({
      UpdateDate,
      UpdateOrganisations,
      ShowDate,
      MemoInput
    }),
    T.map(
      ({
        UpdateDate,
        ShowDate,
        UpdateOrganisations,
        MemoInput
      }): React.FC<R.StateP<S.AppState>> => ({ state }) => (
        <>
          <ShowDate />
          <UpdateDate />
          <UpdateOrganisations />
          {pipe(
            state,
            S.orgsL.get,
            O.map(orgs => <div>{orgs}</div>),
            O.toNullable
          )}
          {pipe(
            state,
            S.errorL.get,
            O.map(error => <div>{error}</div>),
            O.toNullable
          )}
          <MemoInput />
        </>
      )
    )
  )
);
