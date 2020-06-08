import type * as fc from "fast-check"

import { FastCheckURI } from "../hkt"

import { getApplyConfig, AnyEnv } from "@matechs/morphic-alg/config"

export const fcApplyConfig = getApplyConfig(FastCheckURI)

export interface BaseFC {
  [FastCheckURI]: {
    module: typeof fc
  }
}

export const accessFC = <Env extends AnyEnv>(e: Env) =>
  (e as BaseFC)[FastCheckURI].module
