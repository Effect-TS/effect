import U from "short-uuid"
import { v4 } from "uuid"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as I from "@matechs/core/Monocle/Iso"
import * as NT from "@matechs/core/Newtype"
import * as F from "@matechs/core/Service"

export interface UUID
  extends NT.Newtype<{ readonly UUID: "@matechs/uuid/uuidNT" }, string> {}

export interface UUIDBase90
  extends NT.Newtype<{ readonly UUIDBase90: "@matechs/uuid/uuidBase90NT" }, string> {}

export interface UUIDBase58
  extends NT.Newtype<{ readonly UUIDBase58: "@matechs/uuid/uuidBase58" }, string> {}

export const isoUUID = NT.iso<UUID>()
export const isoUUIDBase90 = NT.iso<UUIDBase90>()
export const isoUUIDBase58 = NT.iso<UUIDBase58>()

export const UUIDURI = "@matechs/uuid/UUIDURI"

const UUIDService_ = F.define({
  [UUIDURI]: {
    gen: F.cn<T.Sync<UUID>>(),
    toBase90: F.fn<(uuid: UUID) => T.Sync<UUIDBase90>>(),
    fromBase90: F.fn<(uuid: UUIDBase90) => T.Sync<UUID>>(),
    toBase58: F.fn<(uuid: UUID) => T.Sync<UUIDBase58>>(),
    fromBase58: F.fn<(uuid: UUIDBase58) => T.Sync<UUID>>()
  }
})

export interface UUIDService extends F.TypeOf<typeof UUIDService_> {}

export const UUIDService = F.opaque<UUIDService>()(UUIDService_)

export const UUID = F.layer(UUIDService)({
  [UUIDURI]: {
    gen: T.sync(() => I.wrap(isoUUID)(v4())),
    toBase90: (uuid) =>
      T.sync(() =>
        pipe(
          uuid,
          I.unwrap(isoUUID),
          (x) => U(U.constants.cookieBase90).fromUUID(x),
          I.wrap(isoUUIDBase90)
        )
      ),
    fromBase90: (uuid) =>
      T.sync(() =>
        pipe(
          uuid,
          I.unwrap(isoUUIDBase90),
          (x) => U(U.constants.cookieBase90).toUUID(x),
          I.wrap(isoUUID)
        )
      ),
    toBase58: (uuid) =>
      T.sync(() =>
        pipe(
          uuid,
          I.unwrap(isoUUID),
          (x) => U(U.constants.flickrBase58).fromUUID(x),
          I.wrap(isoUUIDBase58)
        )
      ),
    fromBase58: (uuid) =>
      T.sync(() =>
        pipe(
          uuid,
          I.unwrap(isoUUIDBase58),
          (x) => U(U.constants.flickrBase58).toUUID(x),
          I.wrap(isoUUID)
        )
      )
  }
})

export const {
  [UUIDURI]: { fromBase58, fromBase90, gen, toBase58, toBase90 }
} = F.access(UUIDService)
