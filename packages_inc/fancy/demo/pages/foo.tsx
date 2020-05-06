import { pipe } from "@matechs/prelude"

import * as R from "../../lib"
import { DT } from "../modules/date"
import { dateStateURI } from "../modules/date/state"
import { Foo } from "../view/Foo"

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default R.page(pipe(Foo, DT.provide))({
  [dateStateURI]: DT.initial
})()
