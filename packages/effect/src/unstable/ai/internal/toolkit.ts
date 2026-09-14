import * as Context from "../../../Context.ts"

export const FailureOrigin = Context.Reference<"handler" | "result">("effect/ai/Toolkit/FailureOrigin", {
  defaultValue: () => "result"
})
