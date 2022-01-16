// ets_tracing: off

import type { Cause } from "../../../Cause"
import { pipe } from "../../../Function"
import { LazyValue } from "../../../LazyValue"
import { CauseLogger, defaultCause } from "../../operations/defaultCause"
import { defaultString, StringLogger } from "../../operations/defaultString"
import type { LoggerSet } from "../definition"
import { add } from "./add"
import { empty } from "./empty"

export const defaultSet: LazyValue<LoggerSet<string & Cause<any>, string>> =
  new LazyValue(() =>
    pipe(
      empty<string>(),
      add(StringLogger)(defaultString),
      add(CauseLogger)(defaultCause)
    )
  )
