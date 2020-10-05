import type * as fc from "fast-check"

import type { AnyEnv } from "../../Algebra/config"
import { getApplyConfig } from "../../Algebra/config"
import { FastCheckURI } from "../hkt"

export const fcApplyConfig = getApplyConfig(FastCheckURI)

export interface BaseFC {
  [FastCheckURI]: {
    module: typeof fc
  }
}

export const accessFC = <Env extends AnyEnv>(e: Env) =>
  (e as BaseFC)[FastCheckURI].module
