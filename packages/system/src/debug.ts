import "@effect-ts/tracing-utils/Enable"

import * as T from "./Effect"

/**
 * @trace off
 */
function f(__trace?: string) {
  return T.filterOrElse((a): a is "ok" => a === "ok", T.fail, __trace)
}

f()
