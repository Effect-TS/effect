import type { AnyEnv } from "../../Algebra/config"
import { memo, merge } from "../../Internal/Utils"
import { decoderIntersectionInterpreter } from "./intersection"
import { decoderNewtypeInterpreter } from "./newtype"
import { decoderObjectInterpreter } from "./object"
import { decoderPrimitiveInterpreter } from "./primitives"
import { decoderRecordInterpreter } from "./record"
import { decoderRecursiveInterpreter } from "./recursive"
import { decoderRefinedInterpreter } from "./refined"
import { decoderSetInterpreter } from "./set"
import { decoderTaggedUnionInterpreter } from "./tagged-union"
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
    decoderSetInterpreter<Env>()
  )

export const modelDecoderInterpreter = memo(allModelDecoder) as typeof allModelDecoder
