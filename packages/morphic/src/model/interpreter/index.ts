import { merge } from "../../utils"

import { modelIntersectionInterpreter } from "./intersection"
import { modelNewtypeInterpreter } from "./newtype"
import { modelNonStrictObjectInterpreter, modelStrictObjectInterpreter } from "./object"
import { modelPrimitiveInterpreter } from "./primitives"
import { modelRecursiveInterpreter } from "./recursive"
import { modelRefinedInterpreter } from "./refined"
import { modelSetInterpreter } from "./set"
import { modelStrMapInterpreter } from "./str-map"
import { modelTaggedUnionInterpreter } from "./tagged-unions"
import { modelUnknownInterpreter } from "./unknown"

import type { AnyEnv } from "@matechs/morphic-alg/config"

export const allModelBase = <Env extends AnyEnv>() =>
  merge(
    modelRefinedInterpreter<Env>(),
    modelNewtypeInterpreter<Env>(),
    modelUnknownInterpreter<Env>(),
    modelPrimitiveInterpreter<Env>(),
    modelIntersectionInterpreter<Env>(),
    modelTaggedUnionInterpreter<Env>(),
    modelStrMapInterpreter<Env>(),
    modelSetInterpreter<Env>(),
    modelRecursiveInterpreter<Env>()
  )

export const modelNonStrictInterpreter = <Env extends AnyEnv>() =>
  merge(allModelBase<Env>(), modelNonStrictObjectInterpreter<Env>())

export const modelStrictInterpreter = <Env extends AnyEnv>() =>
  merge(allModelBase<Env>(), modelStrictObjectInterpreter<Env>())
