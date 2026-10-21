/**
 * Effect Auth persistence services and transaction coordination for the Mysql2 Drizzle driver.
 *
 * @stability unstable
 * @since 4.1.0
 */
import type { AnyRelations } from "drizzle-orm"
import { type EffectMysql2Database, makeWithDefaults } from "drizzle-orm/effect-mysql2"
import type { AnyMySqlTable } from "drizzle-orm/mysql-core"
import * as Layer from "effect/Layer"

import type { ExternalIdentityTables, IdentityTables, SubjectProvisioningTables } from "./internal/drizzle/model.ts"
import { Database } from "./internal/drizzle/mysqlDatabase.ts"
import {
  makeMysqlExternalIdentityServices,
  makeMysqlIdentityServices,
  makeMysqlSubjectProvisioningServices
} from "./internal/drizzle/mysqlIdentity.ts"

export {
  /**
   * Service that supplies the application's Drizzle database for persistence operations.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  Database
} from "./internal/drizzle/mysqlDatabase.ts"

import { makeProofTarget } from "./internal/drizzle/proofDrivers.ts"

/**
 * Creates one-time proof services and coordinates their operations in the driver's transaction or atomic batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
const { coordinateProofPersistence, makeProofPersistenceServices } = makeProofTarget(
  Database,
  { mode: "native", dialect: "mysql" }
)

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

import { makePasswordTarget } from "./internal/drizzle/passwordDrivers.ts"

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
} = makePasswordTarget(Database, { mode: "native", dialect: "mysql" })

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
} = makeEmailTarget(Database, { mode: "native", dialect: "mysql" })

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
 * Creates subject provisioning services that record requests and their allocated subject identifiers atomically.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeSubjectProvisioningServices = <
  Subject extends AnyMySqlTable,
  Identifier extends AnyMySqlTable,
  Request extends AnyMySqlTable,
  NativeId
>(
  mapping: SubjectProvisioningTables<Subject, Identifier, Request, NativeId>
) => makeMysqlSubjectProvisioningServices(mapping)

/**
 * Creates services that resolve and update external identity links in the mapped tables.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeExternalIdentityServices = <
  Subject extends AnyMySqlTable,
  External extends AnyMySqlTable,
  NativeId
>(
  mapping: ExternalIdentityTables<Subject, External, NativeId>
) => makeMysqlExternalIdentityServices(mapping)

/**
 * Creates subject provisioning and external identity services from the application's mapped identity tables.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const makeIdentityServices = <
  Subject extends AnyMySqlTable,
  Identifier extends AnyMySqlTable,
  External extends AnyMySqlTable,
  Request extends AnyMySqlTable,
  NativeId
>(
  mapping: IdentityTables<Subject, Identifier, External, Request, NativeId>
) => makeMysqlIdentityServices(mapping)

import { makeOAuthTarget } from "./internal/drizzle/oauthDrivers.ts"

const oauthTarget = makeOAuthTarget<
  Database,
  EffectMysql2Database<AnyRelations>,
  AnyMySqlTable<{ dialect: "mysql" }>
>(Database, {
  mode: "native",
  dialect: "mysql"
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
  EffectMysql2Database<AnyRelations>,
  AnyMySqlTable<{ dialect: "mysql" }>
>(Database, {
  mode: "native",
  dialect: "mysql"
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
  { mode: "native", dialect: "mysql" }
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

/**
 * Layer that constructs the Drizzle database from the matching Effect SQL client.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const databaseLayer = Layer.effect(Database, makeWithDefaults({}))

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
} = makeSessionTarget(Database, { mode: "native", dialect: "mysql" })

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
  dialect: "mysql"
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
