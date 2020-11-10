import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
import { guardIntersectionInterpreter } from "./intersection"
import { guardNewtypeInterpreter } from "./newtype"
import { guardObjectInterpreter } from "./object"
import { guardPrimitiveInterpreter } from "./primitives"
import { guardRecordInterpreter } from "./record"
import { guardRecursiveInterpreter } from "./recursive"
import { guardRefinedInterpreter } from "./refined"
import { guardSetInterpreter } from "./set"
import { guardTaggedUnionInterpreter } from "./tagged-union"
import { guardUnionInterpreter } from "./union"
import { guardUnknownInterpreter } from "./unknown"

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
    guardRecordInterpreter<Env>(),
    guardSetInterpreter<Env>(),
    guardUnionInterpreter<Env>()
  )

export const modelGuardInterpreter = memo(allModelGuard) as typeof allModelGuard
