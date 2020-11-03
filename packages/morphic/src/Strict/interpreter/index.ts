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
    strictSetInterpreter<Env>()
  )

export const modelStrictInterpreter = memo(allModelStrict) as typeof allModelStrict
