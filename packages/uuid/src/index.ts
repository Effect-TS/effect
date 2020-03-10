import U from "short-uuid";
import { v4 } from "uuid";

import { Newtype, iso } from "newtype-ts";
import { effect as T, freeEnv as F } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";

export interface UUID
  extends Newtype<{ readonly UUID: "@matechs/uuid/uuidNT" }, string> {}

export interface UUIDBase90
  extends Newtype<
    { readonly UUIDBase90: "@matechs/uuid/uuidBase90NT" },
    string
  > {}

export interface UUIDBase58
  extends Newtype<
    { readonly UUIDBase58: "@matechs/uuid/uuidBase58" },
    string
  > {}

export const isoUUID = iso<UUID>();
export const isoUUIDBase90 = iso<UUIDBase90>();
export const isoUUIDBase58 = iso<UUIDBase58>();

export const uuidURI = "@matechs/uuid/uuidURI";

export interface UUIDOps {
  gen: T.UIO<UUID>;
  toBase90: (uuid: UUID) => T.UIO<UUIDBase90>;
  fromBase90: (uuid: UUIDBase90) => T.UIO<UUID>;
  toBase58: (uuid: UUID) => T.UIO<UUIDBase58>;
  fromBase58: (uuid: UUIDBase58) => T.UIO<UUID>;
}

export interface UUIDEnv extends F.ModuleShape<UUIDEnv> {
  [uuidURI]: UUIDOps;
}

export const uuidM = F.define<UUIDEnv>({
  [uuidURI]: {
    gen: F.cn(),
    toBase90: F.fn(),
    fromBase90: F.fn(),
    toBase58: F.fn(),
    fromBase58: F.fn()
  }
});

export const uuidEnv = F.instance(uuidM)({
  [uuidURI]: {
    gen: T.sync(() => isoUUID.wrap(v4())),
    toBase90: uuid =>
      T.sync(() =>
        pipe(
          uuid,
          isoUUID.unwrap,
          x => U(U.constants.cookieBase90).fromUUID(x),
          isoUUIDBase90.wrap
        )
      ),
    fromBase90: uuid =>
      T.sync(() =>
        pipe(
          uuid,
          isoUUIDBase90.unwrap,
          x => U(U.constants.cookieBase90).toUUID(x),
          isoUUID.wrap
        )
      ),
    toBase58: uuid =>
      T.sync(() =>
        pipe(
          uuid,
          isoUUID.unwrap,
          x => U(U.constants.flickrBase58).fromUUID(x),
          isoUUIDBase58.wrap
        )
      ),
    fromBase58: uuid =>
      T.sync(() =>
        pipe(
          uuid,
          isoUUIDBase58.unwrap,
          x => U(U.constants.flickrBase58).toUUID(x),
          isoUUID.wrap
        )
      )
  }
});

export const {
  [uuidURI]: { fromBase58, fromBase90, gen, toBase58, toBase90 }
} = F.access(uuidM);
