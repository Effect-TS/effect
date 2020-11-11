import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
import { hashIntersectionInterpreter } from "./intersection"
import { hashNewtypeInterpreter } from "./newtype"
import { hashObjectInterpreter } from "./object"
import { hashPrimitiveInterpreter } from "./primitives"
import { hashRecordInterpreter } from "./record"
import { hashRecursiveInterpreter } from "./recursive"
import { hashRefinedInterpreter } from "./refined"
import { hashSetInterpreter } from "./set"
import { hashTaggedUnionInterpreter } from "./tagged-union"
import { hashUnionInterpreter } from "./union"
import { hashUnknownInterpreter } from "./unknown"

export const allModelHash = <Env extends AnyEnv>() =>
  merge(
    hashRefinedInterpreter<Env>(),
    hashNewtypeInterpreter<Env>(),
    hashUnknownInterpreter<Env>(),
    hashPrimitiveInterpreter<Env>(),
    hashIntersectionInterpreter<Env>(),
    hashObjectInterpreter<Env>(),
    hashTaggedUnionInterpreter<Env>(),
    hashRecursiveInterpreter<Env>(),
    hashSetInterpreter<Env>(),
    hashRecordInterpreter<Env>(),
    hashUnionInterpreter<Env>()
  )

export const modelHashInterpreter = memo(allModelHash) as typeof allModelHash

export { hashIntersectionInterpreter } from "./intersection"
export { hashNewtypeInterpreter } from "./newtype"
export { hashObjectInterpreter } from "./object"
export { hashPrimitiveInterpreter } from "./primitives"
export { hashRecordInterpreter } from "./record"
export { hashRecursiveInterpreter } from "./recursive"
export { hashRefinedInterpreter } from "./refined"
export { hashSetInterpreter } from "./set"
export { hashTaggedUnionInterpreter } from "./tagged-union"
export { hashUnionInterpreter } from "./union"
export { hashUnknownInterpreter } from "./unknown"
