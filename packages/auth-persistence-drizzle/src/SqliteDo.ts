/**
 * Effect Auth persistence services and transaction coordination for the SqliteDo Drizzle driver.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates callback proxy storage backed by the application's Drizzle database.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  OAuthProxyPersistence
} from "./internal/drizzleSqliteOauthProxy.ts"

import { PersistenceConfigurationError } from "@effect/auth-persistence/Adapter"
import { SqliteClient } from "@effect/sql-sqlite-do/SqliteClient"
import type { AnyRelations } from "drizzle-orm"
import { makeWithDefaults } from "drizzle-orm/effect-sqlite-do"

import { NativeDatabase, nativeDatabase } from "./internal/drizzle/nativeDatabase.ts"
import { type DatabaseValue, makeDatabase, makeTransactionHandle } from "./internal/drizzle/sqliteDoDatabase.ts"
export {
  /**
   * Drizzle queries whose transactions are owned by the captured Durable Object SQL client.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type DatabaseValue,
  /**
   * Captures an existing Drizzle database and uses its Effect SQL client for asynchronous transactions.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeDatabase,
  /**
   * Durable Object transaction handle with nested transaction and rollback operations.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type Transaction
} from "./internal/drizzle/sqliteDoDatabase.ts"
import type { AnySQLiteTable } from "drizzle-orm/sqlite-core"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * The application-owned Drizzle queries with Effect SQL transaction ownership.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Database extends Context.Service<Database, DatabaseValue<AnyRelations>>()(
  "@effect/auth-persistence-drizzle/SqliteDo/Database"
) {}

/**
 * Layer that constructs Drizzle with asynchronous transactions owned by the Durable Object SQL client.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const databaseLayer = Layer.effect(
  Database,
  Effect.gen(function*() {
    const client = yield* SqliteClient
    const storage = client.config.storage

    if (storage === undefined) {
      return yield* PersistenceConfigurationError.make({
        reason: "SqliteDo requires a SQL client configured with Durable Object storage"
      })
    }

    return yield* makeDatabase(yield* makeWithDefaults({ storage }))
  })
)

import type { ExternalIdentityTables, IdentityTables, SubjectProvisioningTables } from "./internal/drizzle/model.ts"
import { makePasswordTarget } from "./internal/drizzle/passwordDrivers.ts"
import { makeProofTarget } from "./internal/drizzle/proofDrivers.ts"
import {
  makeSqliteExternalIdentityServices,
  makeSqliteIdentityServices,
  makeSqliteSubjectProvisioningServices
} from "./internal/drizzle/sqliteIdentity.ts"

const proofTarget = makeProofTarget(Database, {
  mode: "native",
  dialect: "sqlite",
  transactionFactory: makeTransactionHandle
})

const passwordTarget = makePasswordTarget(Database, {
  mode: "native",
  dialect: "sqlite",
  transactionFactory: makeTransactionHandle
})

import { makeEmailTarget } from "./internal/drizzle/emailDrivers.ts"

/**
 * Creates email sign-in, address update, and registration services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const {
  makeEmailSignInServices,
  makeEmailAddressServices,
  makeEmailRegistrationServices,
  coordinateEmailAddress,
  coordinateEmailRegistration
} = makeEmailTarget(Database, {
  mode: "native",
  dialect: "sqlite",
  transactionFactory: makeTransactionHandle
})

export {
  /**
   * Runs email address operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateEmailAddress,
  /**
   * Runs email registration operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateEmailRegistration,
  /**
   * Creates email address services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeEmailAddressServices,
  /**
   * Creates email registration services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeEmailRegistrationServices,
  /**
   * Creates email sign-in services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeEmailSignInServices
}

/**
 * Creates password credential and registration services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const {
  coordinatePasswordPersistence,
  coordinatePasswordRegistration,
  makePasswordPersistenceServices,
  makePasswordRegistrationServices
} = passwordTarget

export {
  /**
   * Runs password persistence operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinatePasswordPersistence,
  /**
   * Runs password registration operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinatePasswordRegistration,
  /**
   * Creates password persistence services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasswordPersistenceServices,
  /**
   * Creates password registration services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasswordRegistrationServices
}

/**
 * Creates one-time proof services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const { coordinateProofPersistence, makeProofPersistenceServices } = proofTarget

export {
  /**
   * Runs proof persistence operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateProofPersistence,
  /**
   * Creates proof persistence services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeProofPersistenceServices
}

/**
 * Creates subject provisioning and external identity services from the application's mapped identity tables.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeIdentityServices = <
  Subject extends AnySQLiteTable,
  Identifier extends AnySQLiteTable,
  External extends AnySQLiteTable,
  Request extends AnySQLiteTable,
  NativeId
>(
  mapping: IdentityTables<Subject, Identifier, External, Request, NativeId>
) =>
  makeSqliteIdentityServices(mapping, "interactive").pipe(
    Effect.provideServiceEffect(NativeDatabase, nativeDatabase(Database))
  )

/**
 * Creates subject provisioning services that record requests and their allocated subject identifiers atomically.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeSubjectProvisioningServices = <
  Subject extends AnySQLiteTable,
  Identifier extends AnySQLiteTable,
  Request extends AnySQLiteTable,
  NativeId
>(
  mapping: SubjectProvisioningTables<Subject, Identifier, Request, NativeId>
) =>
  makeSqliteSubjectProvisioningServices(mapping, "interactive").pipe(
    Effect.provideServiceEffect(NativeDatabase, nativeDatabase(Database))
  )

/**
 * Creates services that resolve and update external identity links in the mapped tables.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeExternalIdentityServices = <
  Subject extends AnySQLiteTable,
  External extends AnySQLiteTable,
  NativeId
>(
  mapping: ExternalIdentityTables<Subject, External, NativeId>
) =>
  makeSqliteExternalIdentityServices(mapping).pipe(
    Effect.provideServiceEffect(NativeDatabase, nativeDatabase(Database))
  )

import { makeOAuthTarget } from "./internal/drizzle/oauthDrivers.ts"

const oauthTarget = makeOAuthTarget<
  Database,
  DatabaseValue<AnyRelations>,
  AnySQLiteTable<{ dialect: "sqlite" }>
>(Database, {
  mode: "native",
  dialect: "sqlite",
  transactionFactory: makeTransactionHandle
})

/**
 * Creates OAuth account, sign-in, registration, and retained grant services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const {
  makeOAuthAccountsServices,
  makeOAuthSignInServices,
  makeOAuthRegistrationIntentServices,
  makeOAuthRegistrationServices,
  coordinateOAuthRegistration,
  coordinateOAuthSignIn,
  coordinateOAuthRegistrationIntents,
  coordinateOAuthAccounts,
  makeOAuthConnectedServices,
  makeOAuthConnectedRevocationServices,
  coordinateOAuthConnected,
  coordinateOAuthConnectedRevocations
} = oauthTarget

export {
  /**
   * Runs OAuth accounts operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateOAuthAccounts,
  /**
   * Runs OAuth connected operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateOAuthConnected,
  /**
   * Runs OAuth connected revocations operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateOAuthConnectedRevocations,
  /**
   * Runs OAuth registration operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateOAuthRegistration,
  /**
   * Runs OAuth registration intents operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateOAuthRegistrationIntents,
  /**
   * Runs OAuth sign in operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateOAuthSignIn,
  /**
   * Creates o auth accounts services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOAuthAccountsServices,
  /**
   * Creates o auth connected revocation services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOAuthConnectedRevocationServices,
  /**
   * Creates o auth connected services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOAuthConnectedServices,
  /**
   * Creates o auth registration intent services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOAuthRegistrationIntentServices,
  /**
   * Creates o auth registration services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOAuthRegistrationServices,
  /**
   * Creates o auth sign-in services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOAuthSignInServices
}

import { makePasskeyTarget } from "./internal/drizzle/passkeyDrivers.ts"

const passkeyTarget = makePasskeyTarget<
  Database,
  DatabaseValue<AnyRelations>,
  AnySQLiteTable<{ dialect: "sqlite" }>
>(Database, {
  transactionFactory: makeTransactionHandle,
  mode: "native",
  dialect: "sqlite"
})

/**
 * Creates passkey credential, ceremony, management, and registration services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const {
  makePasskeyCredentialServices,
  makePasskeyPersistenceServices,
  makePasskeyRegistrationCeremonyServices,
  coordinatePasskeyPersistence,
  coordinatePasskeyRegistrationCeremony,
  makePasskeyManagementServices,
  makePasskeyRegistrationServices,
  coordinatePasskeyManagement,
  coordinatePasskeyRegistration
} = passkeyTarget

export {
  /**
   * Runs passkey management operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinatePasskeyManagement,
  /**
   * Runs passkey persistence operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinatePasskeyPersistence,
  /**
   * Runs passkey registration operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinatePasskeyRegistration,
  /**
   * Runs passkey registration ceremony operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinatePasskeyRegistrationCeremony,
  /**
   * Creates passkey credential services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasskeyCredentialServices,
  /**
   * Creates passkey management services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasskeyManagementServices,
  /**
   * Creates passkey persistence services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasskeyPersistenceServices,
  /**
   * Creates passkey registration ceremony services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasskeyRegistrationCeremonyServices,
  /**
   * Creates passkey registration services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasskeyRegistrationServices
}

import { makePhoneTarget } from "./internal/drizzle/phoneDrivers.ts"

/**
 * Creates phone verification services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const { makePhonePersistenceServices, coordinatePhonePersistence } = makePhoneTarget(
  Database,
  { mode: "native", dialect: "sqlite", transactionFactory: makeTransactionHandle }
)

export {
  /**
   * Runs phone persistence operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinatePhonePersistence,
  /**
   * Creates phone persistence services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePhonePersistenceServices
}

import { makeSessionTarget } from "./internal/drizzle/sessionDrivers.ts"

/**
 * Creates authentication authority, pending authentication, and session services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const {
  coordinateAuthenticationAuthority,
  coordinatePendingAuthentication,
  coordinateSignedSessionValidity,
  coordinateStatefulSessions,
  makeAuthenticationAuthorityServices,
  makePendingAuthenticationServices,
  makeSignedSessionValidityServices,
  makeStatefulSessionServices,
  makeSessionStepUpServices,
  coordinateSessionStepUp,
  makeSessionCleanupServices
} = makeSessionTarget(Database, {
  mode: "native",
  dialect: "sqlite",
  transactionFactory: makeTransactionHandle
})

export {
  /**
   * Runs authentication authority operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateAuthenticationAuthority,
  /**
   * Runs pending authentication operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinatePendingAuthentication,
  /**
   * Runs session step up operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateSessionStepUp,
  /**
   * Runs signed session validity operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateSignedSessionValidity,
  /**
   * Runs stateful sessions operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateStatefulSessions,
  /**
   * Creates authentication authority services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeAuthenticationAuthorityServices,
  /**
   * Creates pending authentication services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePendingAuthenticationServices,
  /**
   * Creates session cleanup services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeSessionCleanupServices,
  /**
   * Creates session step-up services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeSessionStepUpServices,
  /**
   * Creates signed session validity services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeSignedSessionValidityServices,
  /**
   * Creates stateful session services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeStatefulSessionServices
}

import { makeTotpTarget } from "./internal/drizzle/totpTarget.ts"

/**
 * Creates TOTP factor services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const { makeTotpPersistenceServices, coordinateTotpPersistence } = makeTotpTarget(Database, {
  mode: "native",
  dialect: "sqlite",
  transactionFactory: makeTransactionHandle
})

export {
  /**
   * Runs TOTP persistence operations in the driver's owned transaction or atomic batch.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  coordinateTotpPersistence,
  /**
   * Creates TOTP persistence services backed by the mapped database tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeTotpPersistenceServices
}
