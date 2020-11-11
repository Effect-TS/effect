import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
import { showIntersectionInterpreter } from "./intersection"
import { showNewtypeInterpreter } from "./newtype"
import { showObjectInterpreter } from "./object"
import { showPrimitiveInterpreter } from "./primitives"
import { showRecordInterpreter } from "./record"
import { showRecursiveInterpreter } from "./recursive"
import { showRefinedInterpreter } from "./refined"
import { showSetInterpreter } from "./set"
import { showTaggedUnionInterpreter } from "./tagged-union"
import { showUnionInterpreter } from "./union"
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
    showRecordInterpreter<Env>(),
    showUnionInterpreter<Env>()
  )

export const modelShowInterpreter = memo(allModelShow) as typeof allModelShow

export { showIntersectionInterpreter } from "./intersection"
export { showNewtypeInterpreter } from "./newtype"
export { showObjectInterpreter } from "./object"
export { showPrimitiveInterpreter } from "./primitives"
export { showRecordInterpreter } from "./record"
export { showRecursiveInterpreter } from "./recursive"
export { showRefinedInterpreter } from "./refined"
export { showSetInterpreter } from "./set"
export { showTaggedUnionInterpreter } from "./tagged-union"
export { showUnionInterpreter } from "./union"
export { showUnknownInterpreter } from "./unknown"
