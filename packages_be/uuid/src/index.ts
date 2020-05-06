import { T, pipe, Service as F } from "@matechs/prelude"
import { Newtype, iso } from "newtype-ts"
import U from "short-uuid"
import { v4 } from "uuid"

export interface UUID
  extends Newtype<{ readonly UUID: "@matechs/uuid/uuidNT" }, string> {}

export interface UUIDBase90
  extends Newtype<{ readonly UUIDBase90: "@matechs/uuid/uuidBase90NT" }, string> {}

export interface UUIDBase58
  extends Newtype<{ readonly UUIDBase58: "@matechs/uuid/uuidBase58" }, string> {}

export const isoUUID = iso<UUID>()
export const isoUUIDBase90 = iso<UUIDBase90>()
export const isoUUIDBase58 = iso<UUIDBase58>()

export const uuidURI = "@matechs/uuid/uuidURI"

const uuidM_ = F.define({
  [uuidURI]: {
    gen: F.cn<T.Sync<UUID>>(),
    toBase90: F.fn<(uuid: UUID) => T.Sync<UUIDBase90>>(),
    fromBase90: F.fn<(uuid: UUIDBase90) => T.Sync<UUID>>(),
    toBase58: F.fn<(uuid: UUID) => T.Sync<UUIDBase58>>(),
    fromBase58: F.fn<(uuid: UUIDBase58) => T.Sync<UUID>>()
  }
})

export interface UUIDEnv extends F.TypeOf<typeof uuidM_> {}

export const uuidM = F.opaque<UUIDEnv>()(uuidM_)

export const provideUUID = F.implement(uuidM)({
  [uuidURI]: {
    gen: T.sync(() => isoUUID.wrap(v4())),
    toBase90: (uuid) =>
      T.sync(() =>
        pipe(
          uuid,
          isoUUID.unwrap,
          (x) => U(U.constants.cookieBase90).fromUUID(x),
          isoUUIDBase90.wrap
        )
      ),
    fromBase90: (uuid) =>
      T.sync(() =>
        pipe(
          uuid,
          isoUUIDBase90.unwrap,
          (x) => U(U.constants.cookieBase90).toUUID(x),
          isoUUID.wrap
        )
      ),
    toBase58: (uuid) =>
      T.sync(() =>
        pipe(
          uuid,
          isoUUID.unwrap,
          (x) => U(U.constants.flickrBase58).fromUUID(x),
          isoUUIDBase58.wrap
        )
      ),
    fromBase58: (uuid) =>
      T.sync(() =>
        pipe(
          uuid,
          isoUUIDBase58.unwrap,
          (x) => U(U.constants.flickrBase58).toUUID(x),
          isoUUID.wrap
        )
      )
  }
})

export const {
  [uuidURI]: { fromBase58, fromBase90, gen, toBase58, toBase90 }
} = F.access(uuidM)
