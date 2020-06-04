import type { AnyEnv } from "@morphic-ts/common/lib/config"

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
import { modelUnionInterpreter } from "./unions"
import { modelUnknownInterpreter } from "./unknown"

export { modelIntersectionInterpreter } from "./intersection"
export { modelNewtypeInterpreter } from "./newtype"
export { modelNonStrictObjectInterpreter, modelStrictObjectInterpreter } from "./object"
export { modelPrimitiveInterpreter } from "./primitives"
export { modelRecursiveInterpreter } from "./recursive"
export { modelRefinedInterpreter } from "./refined"
export { modelSetInterpreter } from "./set"
export { modelStrMapInterpreter } from "./str-map"
export { modelTaggedUnionInterpreter } from "./tagged-unions"
export { modelUnionInterpreter } from "./unions"
export { modelUnknownInterpreter } from "./unknown"

export const allModelBase = <Env extends AnyEnv>() =>
  merge(
    modelRefinedInterpreter<Env>(),
    modelNewtypeInterpreter<Env>(),
    modelUnknownInterpreter<Env>(),
    modelPrimitiveInterpreter<Env>(),
    modelIntersectionInterpreter<Env>(),
    modelUnionInterpreter<Env>(),
    modelTaggedUnionInterpreter<Env>(),
    modelStrMapInterpreter<Env>(),
    modelSetInterpreter<Env>(),
    modelRecursiveInterpreter<Env>()
  )

export const modelNonStrictInterpreter = <Env extends AnyEnv>() =>
  merge(allModelBase<Env>(), modelNonStrictObjectInterpreter<Env>())

export const modelStrictInterpreter = <Env extends AnyEnv>() =>
  merge(allModelBase<Env>(), modelStrictObjectInterpreter<Env>())
