import * as R from "../../src"
import { DT } from "../modules/date"
import { dateStateURI } from "../modules/date/state"
import { Foo } from "../view/Foo"

import { pipe } from "@matechs/core/Function"

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default R.page(pipe(Foo, DT.provide))({
  [dateStateURI]: DT.initial
})()
