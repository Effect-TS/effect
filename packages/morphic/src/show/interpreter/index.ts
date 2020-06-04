import type { AnyEnv } from "@morphic-ts/common/lib/config"
import { merge, memo } from "@morphic-ts/common/lib/utils"

import { showIntersectionInterpreter } from "./intersection"
import { showNewtypeInterpreter } from "./newtype"
import { showObjectInterpreter } from "./object"
import { showPrimitiveInterpreter } from "./primitives"
import { showRecursiveInterpreter } from "./recursive"
import { showRefinedInterpreter } from "./refined"
import { showSetInterpreter } from "./set"
import { showStrMapInterpreter } from "./str-map"
import { showTaggedUnionInterpreter } from "./tagged-union"
import { showUnknownInterpreter } from "./unknown"

export const allModelShow = <Env extends AnyEnv>() =>
  merge(
    showRefinedInterpreter<Env>(),
    showNewtypeInterpreter<Env>(),
    showUnknownInterpreter<Env>(),
    showPrimitiveInterpreter<Env>(),
    showIntersectionInterpreter<Env>(),
    showObjectInterpreter<Env>(),
    showTaggedUnionInterpreter<Env>(),
    showRecursiveInterpreter<Env>(),
    showSetInterpreter<Env>(),
    showStrMapInterpreter<Env>()
  )

export const modelShowInterpreter = memo(allModelShow) as typeof allModelShow
