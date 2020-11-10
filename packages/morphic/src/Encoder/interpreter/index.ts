import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
import { encoderIntersectionInterpreter } from "./intersection"
import { encoderNewtypeInterpreter } from "./newtype"
import { encoderObjectInterpreter } from "./object"
import { encoderPrimitiveInterpreter } from "./primitives"
import { encoderRecordInterpreter } from "./record"
import { encoderRecursiveInterpreter } from "./recursive"
import { encoderRefinedInterpreter } from "./refined"
import { encoderSetInterpreter } from "./set"
import { encoderTaggedUnionInterpreter } from "./tagged-union"
import { encoderUnionInterpreter } from "./union"
import { encoderUnknownInterpreter } from "./unknown"

export const allModelEncoder = <Env extends AnyEnv>() =>
  merge(
    encoderRefinedInterpreter<Env>(),
    encoderNewtypeInterpreter<Env>(),
    encoderUnknownInterpreter<Env>(),
    encoderPrimitiveInterpreter<Env>(),
    encoderIntersectionInterpreter<Env>(),
    encoderObjectInterpreter<Env>(),
    encoderTaggedUnionInterpreter<Env>(),
    encoderRecursiveInterpreter<Env>(),
    encoderRecordInterpreter<Env>(),
    encoderSetInterpreter<Env>(),
    encoderUnionInterpreter<Env>()
  )

export const modelEncoderInterpreter = memo(allModelEncoder) as typeof allModelEncoder
