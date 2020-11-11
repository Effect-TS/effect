import type { AnyEnv } from "../../HKT"
import { memo, merge } from "../../Utils"
import { decoderIntersectionInterpreter } from "./intersection"
import { decoderNewtypeInterpreter } from "./newtype"
import { decoderObjectInterpreter } from "./object"
import { decoderPrimitiveInterpreter } from "./primitives"
import { decoderRecordInterpreter } from "./record"
import { decoderRecursiveInterpreter } from "./recursive"
import { decoderRefinedInterpreter } from "./refined"
import { decoderSetInterpreter } from "./set"
import { decoderTaggedUnionInterpreter } from "./tagged-union"
import { decoderUnionInterpreter } from "./union"
import { decoderUnknownInterpreter } from "./unknown"

export const allModelDecoder = <Env extends AnyEnv>() =>
  merge(
    decoderRefinedInterpreter<Env>(),
    decoderNewtypeInterpreter<Env>(),
    decoderUnknownInterpreter<Env>(),
    decoderPrimitiveInterpreter<Env>(),
    decoderIntersectionInterpreter<Env>(),
    decoderObjectInterpreter<Env>(),
    decoderTaggedUnionInterpreter<Env>(),
    decoderRecursiveInterpreter<Env>(),
    decoderRecordInterpreter<Env>(),
    decoderSetInterpreter<Env>(),
    decoderUnionInterpreter<Env>()
  )

export const modelDecoderInterpreter = memo(allModelDecoder) as typeof allModelDecoder

export { decoderIntersectionInterpreter } from "./intersection"
export { decoderNewtypeInterpreter } from "./newtype"
export { decoderObjectInterpreter } from "./object"
export { decoderPrimitiveInterpreter } from "./primitives"
export { decoderRecordInterpreter } from "./record"
export { decoderRecursiveInterpreter } from "./recursive"
export { decoderRefinedInterpreter } from "./refined"
export { decoderSetInterpreter } from "./set"
export { decoderTaggedUnionInterpreter } from "./tagged-union"
export { decoderUnionInterpreter } from "./union"
export { decoderUnknownInterpreter } from "./unknown"
