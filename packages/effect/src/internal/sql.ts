import * as Context from "../Context.ts"

/** @internal */
export const CurrentTransactionService = Context.Reference<Context.Key<any, object> | undefined>(
  "effect/sql/CurrentTransactionService",
  { defaultValue: () => undefined }
)
