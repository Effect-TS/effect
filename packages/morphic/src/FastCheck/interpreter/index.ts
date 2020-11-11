import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
import { fcIntersectionInterpreter } from "./intersection"
import { fcNewtypeInterpreter } from "./newtype"
import { fcObjectInterpreter } from "./object"
import { fcPrimitiveInterpreter } from "./primitives"
import { fcStrMapInterpreter } from "./record"
import { fcRecursiveInterpreter } from "./recursive"
import { fcRefinedInterpreter } from "./refined"
import { fcSetInterpreter } from "./set"
import { fcTaggedUnionInterpreter } from "./tagged-union"
import { fcUnionInterpreter } from "./union"
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
    fcSetInterpreter<Env>(),
    fcUnionInterpreter<Env>()
  )

export const modelFcInterpreter = memo(allModelFC) as typeof allModelFC

export { fcIntersectionInterpreter } from "./intersection"
export { fcNewtypeInterpreter } from "./newtype"
export { fcObjectInterpreter } from "./object"
export { fcPrimitiveInterpreter } from "./primitives"
export { fcStrMapInterpreter } from "./record"
export { fcRecursiveInterpreter } from "./recursive"
export { fcRefinedInterpreter } from "./refined"
export { fcSetInterpreter } from "./set"
export { fcTaggedUnionInterpreter } from "./tagged-union"
export { fcUnionInterpreter } from "./union"
export { fcUnknownInterpreter } from "./unknown"
