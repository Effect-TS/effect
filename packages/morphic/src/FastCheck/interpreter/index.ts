import type { AnyEnv } from "../../Algebra/config"
import { memo, merge } from "../../Internal/Utils"
import { fcIntersectionInterpreter } from "./intersection"
import { fcNewtypeInterpreter } from "./newtype"
import { fcObjectInterpreter } from "./object"
import { fcPrimitiveInterpreter } from "./primitives"
import { fcStrMapInterpreter } from "./record"
import { fcRecursiveInterpreter } from "./recursive"
import { fcRefinedInterpreter } from "./refined"
import { fcSetInterpreter } from "./set"
import { fcTaggedUnionInterpreter } from "./tagged-union"
import { fcUnknownInterpreter } from "./unknown"

export const allModelFC = <Env extends AnyEnv>() =>
  merge(
    fcRefinedInterpreter<Env>(),
    fcNewtypeInterpreter<Env>(),
    fcUnknownInterpreter<Env>(),
    fcPrimitiveInterpreter<Env>(),
    fcIntersectionInterpreter<Env>(),
    fcObjectInterpreter<Env>(),
    fcTaggedUnionInterpreter<Env>(),
    fcRecursiveInterpreter<Env>(),
    fcStrMapInterpreter<Env>(),
    fcSetInterpreter<Env>()
  )

export const modelFcInterpreter = memo(allModelFC) as typeof allModelFC
