import { effect as T, freeEnv as F } from "@matechs/effect";

// experimental alpha
/* istanbul ignore file */

export const readSideURI: unique symbol = Symbol();

export interface ReadSideConfig extends F.ModuleShape<ReadSideConfig> {
  [readSideURI]: {
    readID: T.UIO<string>;
    readLimit: T.UIO<number>;
    readDelay: T.UIO<number>;
  };
}

export type ReadSideConfigInput = ReadSideConfig[typeof readSideURI];

export const readSideConfig = F.define<ReadSideConfig>({
  [readSideURI]: {
    readID: F.cn(),
    readLimit: F.cn(),
    readDelay: F.cn()
  }
});

export const {
  [readSideURI]: { readID, readLimit, readDelay }
} = F.access(readSideConfig);

export const withConfig = (i: ReadSideConfigInput) =>
  F.implement(readSideConfig)({
    [readSideURI]: i
  });
