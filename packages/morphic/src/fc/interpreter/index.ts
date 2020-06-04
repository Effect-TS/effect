import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo, merge } from "../../utils"

import { fcIntersectionInterpreter } from "./intersection"
import { fcNewtypeInterpreter } from "./newtype"
import { fcObjectInterpreter } from "./object"
import { fcPrimitiveInterpreter } from "./primitives"
import { fcRecursiveInterpreter } from "./recursive"
import { fcRefinedInterpreter } from "./refined"
import { fcSetInterpreter } from "./set"
import { fcStrMapInterpreter } from "./str-map"
import { fcTaggedUnionInterpreter } from "./tagged-union"
import { fcUnionInterpreter } from "./unions"
import { fcUnknownInterpreter } from "./unknown"

export const allModelFC = <Env extends AnyEnv>() =>
  merge(
    fcRefinedInterpreter<Env>(),
    fcNewtypeInterpreter<Env>(),
    fcUnknownInterpreter<Env>(),
    fcPrimitiveInterpreter<Env>(),
    fcIntersectionInterpreter<Env>(),
    fcObjectInterpreter<Env>(),
    fcUnionInterpreter<Env>(),
    fcTaggedUnionInterpreter<Env>(),
    fcRecursiveInterpreter<Env>(),
    fcStrMapInterpreter<Env>(),
    fcSetInterpreter<Env>()
  )

export const modelFcInterpreter = memo(allModelFC) as typeof allModelFC
