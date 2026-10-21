import { LifecycleHooks } from "@effect/auth/Hooks"
import { TotpCryptography, TotpPersistence, TotpSecretKeys } from "@effect/auth/Totp"
import * as BunCrypto from "@effect/platform-bun/BunCrypto"
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as SqliteClient from "@effect/sql-sqlite-bun/SqliteClient"
import * as Kdf from "effect/crypto/Kdf"
import * as KdfAdmission from "effect/crypto/KdfAdmission"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import * as SqliteBun from "@effect/auth-persistence-drizzle/SqliteBun"
import { exampleKeys, mapping, migrate, useAuthenticator } from "./totp-sqlite-consumer.ts"

const DatabaseLive = SqliteBun.databaseLayer.pipe(
  Layer.provideMerge(SqliteClient.layer({ filename: ":memory:" }))
)

Effect.gen(function*() {
  yield* migrate

  const services = yield* SqliteBun.makeTotpPersistenceServices(mapping)

  const result = yield* useAuthenticator.pipe(
    Effect.provideService(TotpPersistence, services.totpPersistence)
  )

  yield* Effect.log(result)
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      TotpCryptography.layer.pipe(
        Layer.provide(
          Layer.mergeAll(
            Layer.succeed(TotpSecretKeys, exampleKeys),
            BunCrypto.layer,
            Layer.merge(Kdf.layerPortable, KdfAdmission.layer())
          )
        )
      ),
      BunCrypto.layer,
      LifecycleHooks.empty,
      DatabaseLive
    )
  ),
  Effect.scoped,
  BunRuntime.runMain
)
