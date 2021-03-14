import "@effect-ts/tracing-utils/Enable"

import * as T from "./Effect"

T.filterOrElse((a): a is "ok" => a === "ok", T.fail)
