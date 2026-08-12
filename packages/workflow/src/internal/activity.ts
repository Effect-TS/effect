import * as Context from "effect/Context"

export class CurrentActivityExecution
  extends Context.Reference<CurrentActivityExecution>()("@effect/workflow/internal/CurrentActivityExecution", {
    defaultValue: () => false
  })
{}
