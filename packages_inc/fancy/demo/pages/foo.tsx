import { pipe } from "@matechs/prelude";
import { Foo } from "../view/Foo";
import { DT } from "../modules/date";
import * as R from "../../lib";
import { dateStateURI } from "../modules/date/state";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default R.page(pipe(Foo, DT.provide))({
  [dateStateURI]: DT.initial
})();
