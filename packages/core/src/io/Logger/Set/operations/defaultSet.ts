import { pipe } from "../../../../data/Function"
import type { Has } from "../../../../data/Has"
import { LazyValue } from "../../../../data/LazyValue"
import type { Cause } from "../../../Cause"
import { CauseLogger, defaultCause } from "../../operations/defaultCause"
import { defaultString, StringLogger } from "../../operations/defaultString"
import type { LoggerSet } from "../definition"
import { add } from "./add"
import { empty } from "./empty"

export const defaultSet: LazyValue<LoggerSet<Has<string> & Has<Cause<any>>, string>> =
  new LazyValue(() =>
    pipe(
      empty<string>(),
      add(StringLogger)(defaultString),
      add(CauseLogger)(defaultCause)
    )
  )
