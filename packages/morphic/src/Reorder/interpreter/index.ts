import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
import { reorderIntersectionInterpreter } from "./intersection"
import { reorderNewtypeInterpreter } from "./newtype"
import { reorderObjectInterpreter } from "./object"
import { reorderPrimitiveInterpreter } from "./primitives"
import { reorderRecordInterpreter } from "./record"
import { reorderRecursiveInterpreter } from "./recursive"
import { reorderRefinedInterpreter } from "./refined"
import { reorderSetInterpreter } from "./set"
import { reorderTaggedUnionInterpreter } from "./tagged-union"
import { reorderUnionInterpreter } from "./union"
import { reorderUnknownInterpreter } from "./unknown"

export const allModelReorder = <Env extends AnyEnv>() =>
  merge(
    reorderRefinedInterpreter<Env>(),
    reorderNewtypeInterpreter<Env>(),
    reorderUnknownInterpreter<Env>(),
    reorderPrimitiveInterpreter<Env>(),
    reorderIntersectionInterpreter<Env>(),
    reorderObjectInterpreter<Env>(),
    reorderTaggedUnionInterpreter<Env>(),
    reorderRecursiveInterpreter<Env>(),
    reorderRecordInterpreter<Env>(),
    reorderSetInterpreter<Env>(),
    reorderUnionInterpreter<Env>()
  )

export const modelReorderInterpreter = memo(allModelReorder) as typeof allModelReorder

export { reorderIntersectionInterpreter } from "./intersection"
export { reorderNewtypeInterpreter } from "./newtype"
export { reorderObjectInterpreter } from "./object"
export { reorderPrimitiveInterpreter } from "./primitives"
export { reorderRecordInterpreter } from "./record"
export { reorderRecursiveInterpreter } from "./recursive"
export { reorderRefinedInterpreter } from "./refined"
export { reorderSetInterpreter } from "./set"
export { reorderTaggedUnionInterpreter } from "./tagged-union"
export { reorderUnionInterpreter } from "./union"
export { reorderUnknownInterpreter } from "./unknown"
