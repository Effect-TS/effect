import * as R from "../../lib";
import { effect as T } from "@matechs/effect";
import { none } from "fp-ts/lib/Option";
import { DateState } from "./date";
import { OrgsState } from "./orgs";

// alpha
/* istanbul ignore file */

export const App = R.app({
  date: DateState.type,
  orgs: OrgsState.type
})({
  date: T.sync(() => DateState.build({ current: new Date() })),
  orgs: T.pure(OrgsState.build({ error: none, found: none }))
});
