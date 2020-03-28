import * as BAB from "babylonjs";
import { effect as T, freeEnv as F } from "@matechs/effect";

// WIP
/* istanbul ignore file */

export const EngineURI = "@matechs/babylon/EngineURI";

const Engine_ = F.define({
  [EngineURI]: {
    accessEngine: F.cn<T.UIO<BAB.Engine>>()
  }
});

export interface Engine extends F.TypeOf<typeof Engine_> {}
export const Engine = F.opaque<Engine>()(Engine_);

export const { accessEngine } = F.access(Engine)[EngineURI];

export const provideEngine = (_: BAB.Engine) =>
  F.implement(Engine)({
    [EngineURI]: {
      accessEngine: T.pure(_)
    }
  });
