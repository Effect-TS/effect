import * as R from "../../lib";
import { effect as T } from "@matechs/effect";
import { summon } from "morphic-ts/lib/batteries/summoner-no-union";
import { none } from "fp-ts/lib/Option";

// alpha
/* istanbul ignore file */

export const DateState = summon(F =>
  F.interface(
    {
      current: F.date()
    },
    "DateState"
  )
);

export const OrgsState = summon(F =>
  F.interface(
    {
      found: F.nullable(F.string()),
      error: F.nullable(F.string())
    },
    "OrgsState"
  )
);

export const App = R.app({
  date: DateState.type,
  orgs: OrgsState.type
})({
  date: T.sync(() => DateState.build({ current: new Date() })),
  orgs: T.pure(OrgsState.build({ error: none, found: none }))
});
