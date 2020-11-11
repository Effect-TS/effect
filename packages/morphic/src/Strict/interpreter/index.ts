import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
import { strictIntersectionInterpreter } from "./intersection"
import { strictNewtypeInterpreter } from "./newtype"
import { strictObjectInterpreter } from "./object"
import { strictPrimitiveInterpreter } from "./primitives"
import { strictRecordInterpreter } from "./record"
import { strictRecursiveInterpreter } from "./recursive"
import { strictRefinedInterpreter } from "./refined"
import { strictSetInterpreter } from "./set"
import { strictTaggedUnionInterpreter } from "./tagged-union"
import { strictUnionInterpreter } from "./union"
import { strictUnknownInterpreter } from "./unknown"

export const allModelStrict = <Env extends AnyEnv>() =>
  merge(
    strictRefinedInterpreter<Env>(),
    strictNewtypeInterpreter<Env>(),
    strictUnknownInterpreter<Env>(),
    strictPrimitiveInterpreter<Env>(),
    strictIntersectionInterpreter<Env>(),
    strictObjectInterpreter<Env>(),
    strictTaggedUnionInterpreter<Env>(),
    strictRecursiveInterpreter<Env>(),
    strictRecordInterpreter<Env>(),
    strictSetInterpreter<Env>(),
    strictUnionInterpreter<Env>()
  )

export const modelStrictInterpreter = memo(allModelStrict) as typeof allModelStrict

export { strictIntersectionInterpreter } from "./intersection"
export { strictNewtypeInterpreter } from "./newtype"
export { strictObjectInterpreter } from "./object"
export { strictPrimitiveInterpreter } from "./primitives"
export { strictRecordInterpreter } from "./record"
export { strictRecursiveInterpreter } from "./recursive"
export { strictRefinedInterpreter } from "./refined"
export { strictSetInterpreter } from "./set"
export { strictTaggedUnionInterpreter } from "./tagged-union"
export { strictUnionInterpreter } from "./union"
export { strictUnknownInterpreter } from "./unknown"
