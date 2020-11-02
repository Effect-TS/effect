import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
//import { eqIntersectionInterpreter } from "./intersection"
//import { eqNewtypeInterpreter } from "./newtype"
//import { eqObjectInterpreter } from "./object"
import { eqPrimitiveInterpreter } from "./primitives"
//import { eqRecordMapInterpreter } from "./record"
//import { eqRecursiveInterpreter } from "./recursive"
//import { eqRefinedInterpreter } from "./refined"
//import { eqSetInterpreter } from "./set"
import { eqTaggedUnionInterpreter } from "./tagged-union"
//import { eqUnknownInterpreter } from "./unknown"

export const allModelEq = <Env extends AnyEnv>() =>
  merge(
    //    eqRefinedInterpreter<Env>(),
    //    eqNewtypeInterpreter<Env>(),
    //    eqUnknownInterpreter<Env>(),
    eqPrimitiveInterpreter<Env>(),
    //    eqIntersectionInterpreter<Env>(),
    //    eqObjectInterpreter<Env>(),
    eqTaggedUnionInterpreter<Env>()
    ///    eqRecursiveInterpreter<Env>(),
    ///    eqRecordMapInterpreter<Env>(),
    ///    eqSetInterpreter<Env>()
  )

export const modelEqInterpreter = memo(allModelEq) as typeof allModelEq
