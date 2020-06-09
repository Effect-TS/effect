import { merge, memo } from "../../utils"

import { guardIntersectionInterpreter } from "./intersection"
import { guardNewtypeInterpreter } from "./newtype"
import { guardObjectInterpreter } from "./object"
import { guardPrimitiveInterpreter } from "./primitives"
import { guardRecursiveInterpreter } from "./recursive"
import { guardRefinedInterpreter } from "./refined"
import { guardSetInterpreter } from "./set"
import { guardStrMapInterpreter } from "./str-map"
import { guardTaggedUnionInterpreter } from "./tagged-union"
import { guardUnknownInterpreter } from "./unknown"

import type { AnyEnv } from "@matechs/morphic-alg/config"

export const allModelGuard = <Env extends AnyEnv>() =>
  merge(
    guardRefinedInterpreter<Env>(),
    guardNewtypeInterpreter<Env>(),
    guardUnknownInterpreter<Env>(),
    guardPrimitiveInterpreter<Env>(),
    guardIntersectionInterpreter<Env>(),
    guardObjectInterpreter<Env>(),
    guardTaggedUnionInterpreter<Env>(),
    guardRecursiveInterpreter<Env>(),
    guardStrMapInterpreter<Env>(),
    guardSetInterpreter<Env>()
  )

export const modelGuardInterpreter = memo(allModelGuard) as typeof allModelGuard
