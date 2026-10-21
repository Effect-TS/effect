/**
 * Adapter contracts for typed table mappings and native SQL factories. Drivers supply physical codecs,
 * SQL expressions, and transaction or batch capabilities to one commit owner.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Storage mapping for email verification and address changes with application table and subject ID
   * types erased for adapter composition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyEmailAddressMapping,
  /**
   * Storage mapping for email registration and proof redemption with application table and subject ID
   * types erased for adapter composition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyEmailRegistrationMapping,
  /**
   * Storage mapping for email sign-in target lookup with application table and subject ID types erased
   * for adapter composition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyEmailSignInMapping,
  /**
   * Table mappings, codecs, and policies for email verification and address changes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailAddressMapping,
  /**
   * Columns and row codecs for email shared credential authority and security revisions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailAuthorityCredentialTable,
  /**
   * Columns and row codecs for email credential identity, revision, and persisted authentication data.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailCredentialReadTable,
  /**
   * Columns and row codecs for email credential identity, revision, and persisted authentication data.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailCredentialTable,
  /**
   * Columns and row codecs for email identifier ownership, binding revisions, and verification state.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailIdentifierReadTable,
  /**
   * Columns and row codecs for email identifier ownership, binding revisions, and verification state.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailIdentifierTable,
  /**
   * Columns and row codecs for email shared credential authority created by registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationAuthorityCredentialTable,
  /**
   * Columns and row codecs for email credential rows inserted by registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationCredentialTable,
  /**
   * Columns and row codecs for email identifier ownership inserted by registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationIdentifierTable,
  /**
   * Email registration command, application snapshot, and proof redemption bound to one provisioning
   * attempt.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationIntent,
  /**
   * Table mappings, codecs, and policies for email registration and proof redemption.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationMapping,
  /**
   * Subject ID allocation and row encoding used when provisioning an email registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationProvisioning,
  /**
   * Table mappings, codecs, and policies for email sign-in target lookup.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailSignInMapping,
  /**
   * Columns and row codecs for email subject status, security revisions, and authentication
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailSubjectReadTable,
  /**
   * Columns and row codecs for email subject status, security revisions, and authentication
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailSubjectTable,
  /**
   * Uniqueness guarantees required for email address storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredEmailAddressConstraints,
  /**
   * Uniqueness guarantees required for email address storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredEmailAddressConstraints,
  /**
   * Uniqueness guarantees required for email registration storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredEmailRegistrationConstraints,
  /**
   * Uniqueness guarantees required for email registration storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredEmailRegistrationConstraints,
  /**
   * Uniqueness guarantees required for email sign in storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredEmailSignInConstraints,
  /**
   * Uniqueness guarantees required for email sign in storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredEmailSignInConstraints
} from "./internal/models/emailModel.ts"

export {
  /**
   * Primary-database planning configuration for passkey writes committed through D1 batches.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type D1PasskeyMapping,
  /**
   * Table mappings, codecs, and policies for passkey challenge issuance and consumption.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCeremonyMapping,
  /**
   * Timestamp codecs and database-clock expressions used to compare authentication deadlines in SQL.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyClock,
  /**
   * Column-name type accepted by a mapped passkey table.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PasskeyColumn,
  /**
   * Table mappings, codecs, and policies for passkey subject and credential lookup.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCredentialMapping,
  /**
   * Columns and row codecs for passkey credential identity, revision, and persisted authentication data.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCredentialReadTable,
  /**
   * Passkey credential lookup service produced by a mapped credential adapter.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCredentialServices,
  /**
   * Builds a layer providing passkey credential lookup from an effect that creates the adapter services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  passkeyCredentialsLayer,
  /**
   * Columns and row codecs for passkey shared credential factors and their current revisions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyFactorReadTable,
  /**
   * Passkey ceremony snapshot supplied when inserting an immutable challenge.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyFlowInsert,
  /**
   * Columns and row codecs for passkey single-use challenge snapshots and access guards.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyFlowTable,
  /**
   * Passkey mapping supplied directly or acquired through an effect during adapter setup.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyMappingSource,
  /**
   * Builds a layer providing passkey ceremony persistence from an effect that creates the adapter
   * services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  passkeyPersistenceLayer,
  /**
   * Table mappings, codecs, and policies for passkey credential lookup, ceremonies, and counter
   * telemetry.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyPersistenceMapping,
  /**
   * Passkey ceremony persistence service produced by a mapped challenge adapter.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyPersistenceServices,
  /**
   * Synchronous, exact conversions between native subject IDs and passkey authentication subject IDs.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeySubjectIdCodec,
  /**
   * Columns and row codecs for passkey subject status, security revisions, and authentication
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeySubjectReadTable,
  /**
   * Uniqueness guarantees required for passkey credential storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredPasskeyCredentialConstraints,
  /**
   * Uniqueness guarantees required for passkey persistence storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredPasskeyPersistenceConstraints
} from "./internal/models/passkeyModel.ts"

export {
  /**
   * Challenge purposes, issuance, and assertion-consumption capabilities owned by passkey registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationCeremonyCapabilities,
  /**
   * Table mappings, codecs, and policies for registration-owned passkey challenge issuance and
   * consumption.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationCeremonyMapping,
  /**
   * Registration ceremony capabilities returned by a passkey challenge adapter.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationCeremonyServices
} from "./internal/models/passkeyRegistrationCeremonyModel.ts"

export {
  /**
   * Credential, subject ID, public summary, and registration marker supplied to a passkey insert.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCredentialInsert,
  /**
   * Subject and security revisions used to invalidate sessions or pending authentication after a
   * passkey mutation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyInvalidationInput,
  /**
   * Mapped table update and postcondition applied by the passkey mutation's SQL commit owner.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyInvalidationMutation,
  /**
   * Constructs a mapped session or pending-authentication update to commit with a passkey mutation.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  passkeyInvalidationMutation,
  /**
   * Table mappings, codecs, and policies for passkey management and session invalidation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyManagementMapping,
  /**
   * Passkey management persistence service produced by a mapped write adapter.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyManagementServices,
  /**
   * Table mappings, codecs, and policies for passkey registration and application snapshots.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationMapping,
  /**
   * Passkey registration authority produced by a mapped registration adapter.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationServices,
  /**
   * Adapter callbacks for inspecting, issuing, and completing a passkey registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationWriter,
  /**
   * Credential and shared authority tables with the guarded policies used by passkey mutations.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyWriteTables
} from "./internal/models/passkeyWriteModel.ts"

export {
  /**
   * Storage mapping for password sign-in and credential management with application table and subject
   * ID types erased for adapter composition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyPasswordPersistenceMapping,
  /**
   * Storage mapping for password registration and subject provisioning with application table and
   * subject ID types erased for adapter composition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyPasswordRegistrationMapping,
  /**
   * Columns and row codecs for password shared credential authority and security revisions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordAuthorityCredentialTable,
  /**
   * Columns and row codecs for password credential identity, revision, and persisted authentication
   * data.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordCredentialTable,
  /**
   * Columns and row codecs for password identifier ownership, binding revisions, and verification state.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordIdentifierTable,
  /**
   * Table mappings, codecs, and policies for password sign-in and credential management.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordPersistenceMapping,
  /**
   * Classifiers distinguishing identifier and credential uniqueness conflicts during password
   * registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationConstraintClassifier,
  /**
   * Password registration identifier, application snapshot, request ID, and replacement verifier to
   * commit together.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationIntent,
  /**
   * Table mappings, codecs, and policies for password registration and subject provisioning.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationMapping,
  /**
   * Subject ID allocation and row encoding used when provisioning a password registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationProvisioning,
  /**
   * Columns and row codecs for password subject status, security revisions, and authentication
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordSubjectTable,
  /**
   * Uniqueness guarantees required for password storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredPasswordConstraints,
  /**
   * Uniqueness guarantees required for password storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredPasswordConstraints,
  /**
   * Uniqueness guarantees required for password registration storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredPasswordRegistrationConstraints,
  /**
   * Uniqueness guarantees required for password registration storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredPasswordRegistrationConstraints
} from "./internal/models/passwordModel.ts"

export {
  /**
   * Storage mapping for proof issuance, redemption, and failure budgets with application table and
   * subject ID types erased for adapter composition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyProofPersistenceMapping,
  /**
   * Timestamp codecs and database-clock expressions used to compare authentication deadlines in SQL.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofClock,
  /**
   * Table mappings, codecs, and policies for proof issuance, redemption, and failure budgets.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofPersistenceMapping,
  /**
   * Columns and insert encoding for the current proof series, canonical binding, verifier, expiry, and
   * failed-attempt count.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofTable,
  /**
   * Uniqueness guarantees required for proof storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredProofConstraints,
  /**
   * Uniqueness guarantees required for proof storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredProofConstraints
} from "./internal/models/proofModel.ts"

export {
  /**
   * Table mappings, codecs, and policies for current subject and credential authentication authority.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthenticationAuthorityMapping,
  /**
   * Table mappings, codecs, and policies for pending login records and authentication evidence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PendingAuthenticationMapping,
  /**
   * Pending login record codec used to retain and restore authentication evidence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PendingAuthenticationTables,
  /**
   * Uniqueness guarantees required for pending authentication storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredPendingAuthenticationConstraints,
  /**
   * Uniqueness guarantees required for pending authentication storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredPendingAuthenticationConstraints,
  /**
   * Uniqueness guarantees required for session storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredSessionConstraints,
  /**
   * Uniqueness guarantees required for session storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredSessionConstraints,
  /**
   * Uniqueness guarantees required for signed validity storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredSignedValidityConstraints,
  /**
   * Uniqueness guarantees required for signed validity storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredSignedValidityConstraints,
  /**
   * Uniqueness guarantees required for stateful pending storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredStatefulPendingConstraints,
  /**
   * Uniqueness guarantees required for stateful pending storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredStatefulPendingConstraints,
  /**
   * Subject and credential authority tables used to assess current authentication evidence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionAuthorityTables,
  /**
   * Mapped session and pending tables cleaned with one total deletion limit per operation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionCleanupMapping,
  /**
   * SQL clock, module identity, conflict classification, and optional D1 execution policy for session
   * storage.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionExecution,
  /**
   * Conversions and equality checks between native database session IDs and authentication session IDs.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionIdCodec,
  /**
   * Guard columns and immutable snapshot inserted for pending login or step-up authentication.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionPendingInsert,
  /**
   * Shared guarded table for single-use pending login and step-up authentication records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionPendingTables,
  /**
   * Subject table and ID codec used to check session subject status and security revisions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionSubjectTables,
  /**
   * Table mappings, codecs, and policies for signed-session revocation tombstones.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SignedSessionValidityMapping,
  /**
   * Revocation tombstone table and session ID codec for signed-session validity checks.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SignedSessionValidityTables,
  /**
   * Table mappings, codecs, and policies for stateful session issuance, rotation, and revocation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StatefulSessionMapping,
  /**
   * Session record table and native ID codec used by stateful session persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StatefulSessionTables
} from "./internal/models/sessionModel.ts"

export {
  /**
   * Uniqueness guarantees required for session step up storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredSessionStepUpConstraints,
  /**
   * Uniqueness guarantees required for session step up storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredSessionStepUpConstraints,
  /**
   * Table mappings, codecs, and policies for pending session step-up authentication.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionStepUpMapping,
  /**
   * Stateful session source used to recover the exact record inspected for step-up authentication.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionStepUpSourceTables
} from "./internal/models/stepUpModel.ts"

export {
  /**
   * Rejects a SQL transaction already present in the current context so an operation can own its
   * durable commit.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  requireStandalone
} from "./internal/standalone.ts"

export {
  /**
   * Creates durable OAuth callback-proxy storage from an explicit SQL table mapping.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOAuthProxyPersistence, /**
   * Physical columns and SQL timestamp codecs used by callback-proxy attempt storage.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthProxySqlTable
} from "./internal/oauthProxy.ts"

export {
  /**
   * Checks that every nested failure is a recognized constraint conflict before allowing conflict
   * recovery.
   *
   * @stability unstable
   * @category predicates
   * @since 4.1.0
   */
  isMappedConstraintConflict, /**
   * Failure indicating that a storage mapping, codec, or mapped row is invalid.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PersistenceMappingError
} from "./internal/mappingError.ts"
export type {
  /**
   * SQL expression type supplied by a storage adapter for mapped conditions, clock expressions, and
   * mutations.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  SqlExpression, /**
   * Table contract associating a physical table with its column names and selected, inserted, and
   * updated row types.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  TableModel
} from "./internal/tableModel.ts"

export {
  /**
   * Failure indicating that an authentication definition or storage configuration cannot be supplied by
   * this adapter.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PersistenceConfigurationError
} from "./internal/configuration.ts"
export type {
  /**
   * Conversions and equality checks between application subject IDs and authentication subject IDs.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  SubjectIdCodec
} from "./internal/models/common.ts"
export {
  /**
   * Creates a persistence facade from a driver backend while retaining the authentication definition's
   * strategy and session requirements.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  createPersistence
} from "./internal/persistence.ts"
export type {
  /**
   * Service contract for inspecting and atomically provisioning a password registration with its
   * credential binding.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  PasswordRegistrationAuthority
} from "./internal/registrationContract.ts"
export {
  /**
   * Derives strategy table mappings and captured ID allocators from managed or application-owned
   * storage.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeMappings as makeStorageMappings
} from "./internal/storageMapping.ts"
export {
  /**
   * Logical authentication table roles selected by the configured strategies and session mode.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StorageRole, /**
   * Physical table declaration containing its name, columns, and uniqueness guarantees.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StorageTable, /**
   * Column definitions and uniqueness guarantees for each managed authentication storage role.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  storageTables
} from "./internal/storageTables.ts"

export type {
  /**
   * Configuration and provisioning services, layer, and storage builders bound to one authentication
   * definition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  BoundPersistence, /**
   * Context-free schema codec used to encode and decode application session claims.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  ClaimsCodec, /**
   * Authentication namespace, claims codec, session configuration, and strategies accepted by
   * persistence composition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  Definition, /**
   * Factory binding driver-specific storage builders and service requirements to an authentication
   * definition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  PersistenceApi
} from "./internal/configuration.ts"

export {
  /**
   * Database table identity inspected when validating a storage mapping.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PhysicalStorageTable,
  /**
   * Physical table and required uniqueness keys checked against one database catalog snapshot.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StorageValidation,
  /**
   * Validates mapped columns and uniqueness guarantees against the active SQL database.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validateStorage,
  /**
   * Validates multiple mapped tables while sharing metadata reads from the current acquisition snapshot.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validateStorageBatch,
  /**
   * Shares storage metadata reads while constructing one service graph, discarding the cache when
   * acquisition ends.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  withStorageValidation
} from "./internal/storageValidation.ts"

export type {
  /**
   * Shared subject configuration, physical role tables, and timestamp codecs used to derive strategy
   * mappings.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  MappingInput
} from "./internal/configuration.ts"

export type {
  /**
   * Driver capabilities for table construction, database acquisition, native SQL access, and optional
   * atomic batches.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  Backend
} from "./internal/persistence.ts"

export {
  /**
   * Creates native SQL table accessors from a client and the driver's physical table codecs.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeSqlTables,
  /**
   * Creates an ordinal column alias from a validated short ASCII prefix.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  nativeSqlAlias,
  /**
   * Factory for native SQL table handles and mapped expression compilation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativeSqlTables,
  /**
   * Native table handle for quoted columns, row codecs, and parameterized inserts and updates.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SqlTable
} from "./internal/nativeSqlTable.ts"

export {
  /**
   * Creates passkey lookup and ceremony services for a driver-provided atomic SQL batch.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeBatchPasskeyServices,
  /**
   * Creates passkey credential lookup services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativePasskeyCredentialServices,
  /**
   * Creates passkey credential lookup and ceremony persistence services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativePasskeyServices
} from "./internal/passkeyNative.ts"

export {
  /**
   * Creates passkey challenge issuance and consumption services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativePasskeyCeremonyServices,
  /**
   * Table mappings, codecs, and policies for passkey challenge issuance and consumption.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativePasskeyCeremonyMapping
} from "./internal/passkeyNativeCeremony.ts"

export {
  /**
   * Creates guarded passkey management writes over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasskeyNativeManagement, /**
   * Table mappings, codecs, and policies for passkey management and session invalidation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativePasskeyManagementMapping
} from "./internal/passkeyNativeWrite.ts"

export {
  /**
   * Creates passkey registration writes and challenge ownership over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasskeyNativeRegistration,
  /**
   * Table mappings, codecs, and policies for passkey registration and application snapshots.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativePasskeyRegistrationMapping
} from "./internal/passkeyNativeRegistration.ts"

export {
  /**
   * Table mappings, codecs, and policies for passkey credential lookup and ceremony persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyNativeMapping, /**
   * Passkey credential, subject, and authority mappings with physical table types erased at the native
   * SQL boundary.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyNativeRead
} from "./internal/passkeyNativeState.ts"

export {
  /**
   * Effect that captures a statement collector bound to the current SQL batch owner.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  captureSqlBatchStatements,
  /**
   * Creates an executor that binds SQL operations, lifecycle hooks, receipts, and postconditions to one
   * commit owner.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeSqlCommitExecutor,
  /**
   * Service supplying the driver's batch commit capability to authentication operations.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  SqlBatchCommit,
  /**
   * Service supplying a native transaction boundary shared by authentication and application writes.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  SqlNativeCommit
} from "./internal/sqlCommit.ts"

export {
  /**
   * Extracts required table-key plans from mapping constraints and adapter column metadata.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  storageKeyPlans
} from "./internal/storagePlans.ts"

export {
  /**
   * Table mappings, codecs, and policies for OAuth account linking, unlinking, eligibility, and cleanup.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAccountsMapping,
  /**
   * OAuth account-management action authorized by an action challenge.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAction,
  /**
   * Columns and row codecs for O auth shared credential authority and current revisions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAuthorityReadTable,
  /**
   * Columns and row codecs for O auth shared credential authority and current revisions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAuthorityTable,
  /**
   * Captured subject-scoped table and condition for cleanup during an OAuth account mutation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCleanupDescriptor,
  /**
   * Columns and row codecs for O auth subject-scoped cleanup and retirement conditions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCleanupTable,
  /**
   * Captures a typed subject-scoped cleanup table for OAuth account mutations.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthCleanupTable,
  /**
   * Timestamp codecs and database-clock expressions used to compare authentication deadlines in SQL.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthClock,
  /**
   * Columns and row codecs for O auth credential identity, revision, and persisted authentication data.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCredentialReadTable,
  /**
   * Columns and row codecs for O auth credential identity, revision, and persisted authentication data.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCredentialTable,
  /**
   * Primary-database planning configuration for OAuth writes committed through D1 batches.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthD1Mapping,
  /**
   * Captured subject-scoped method table and condition used to assess remaining OAuth sign-in
   * eligibility.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityDescriptor,
  /**
   * Fact describing whether one installed authentication method remains eligible for a subject.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityFact,
  /**
   * Columns and row codecs for O auth subject-scoped authentication method eligibility.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityTable,
  /**
   * Captures a typed method table and eligibility predicate for OAuth account policy checks.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthEligibilityTable,
  /**
   * Columns and row codecs for O auth single-use challenge snapshots and access guards.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthFlowTable,
  /**
   * Columns and row codecs for O auth provider identity ownership and application subject binding.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthOwnershipReadTable,
  /**
   * Columns and row codecs for O auth provider identity ownership and application subject binding.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthOwnershipTable,
  /**
   * Service contract for inspecting and committing OAuth registration under one subject and identity
   * owner.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationAuthority,
  /**
   * Captured table ordering and predicate used to guard application OAuth registration conditions.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationGuardDescriptor,
  /**
   * Columns and row codecs for O auth guarded application registration predicates and row ordering.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationGuardTable,
  /**
   * Captures a typed table predicate and deterministic row order for OAuth registration guards.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthRegistrationGuardTable,
  /**
   * Table mappings, codecs, and policies for OAuth registration intents and identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationIntentMapping,
  /**
   * Columns and row codecs for O auth the original registration binding and retained decision.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationIntentTable,
  /**
   * Table mappings, codecs, and policies for OAuth subject registration and identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationMapping,
  /**
   * Table mappings, codecs, and policies for OAuth sign-in and provider identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSignInMapping,
  /**
   * Columns and row codecs for O auth subject status, security revisions, and authentication
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSubjectReadTable,
  /**
   * Columns and row codecs for O auth subject status, security revisions, and authentication
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSubjectTable,
  /**
   * Uniqueness guarantees required for O auth registration storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredOAuthRegistrationConstraints,
  /**
   * Uniqueness guarantees required for O auth sign in storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredOAuthSignInConstraints
} from "./internal/models/oauthModel.ts"

export {
  /**
   * Connected-account action authorized by a retained-grant action challenge.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedAction,
  /**
   * Columns and row codecs for O auth sealed provider grants and exact refresh compare-and-set fields.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedGrantTable,
  /**
   * Table mappings, codecs, and policies for retained provider grants and guarded account policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedMapping,
  /**
   * Subject revision and action or grant context supplied to a guarded connected-account SQL policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedPolicyInput,
  /**
   * Columns and row codecs for O auth the removed grant ciphertext and single-use provider revocation
   * claim.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedRevocationJobTable,
  /**
   * Table mappings, codecs, and policies for single-use provider grant-revocation jobs.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedRevocationMapping,
  /**
   * SQL predicate guarding a connected-account mutation against current subject policy and security
   * revision.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedSqlPolicy,
  /**
   * Uniqueness guarantees required for O auth connected storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredOAuthConnectedConstraints,
  /**
   * Uniqueness guarantees required for O auth connected revocation storage to arbitrate concurrent
   * writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredOAuthConnectedRevocationConstraints
} from "./internal/models/oauthConnectedModel.ts"

export {
  /**
   * Creates OAuth sign-in flows services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeOAuthSignInServices
} from "./internal/oauth/nativeSignIn.ts"
export type {
  /**
   * Table mappings, codecs, and policies for OAuth sign-in and provider identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OAuthNativeReadMapping
} from "./internal/oauth/nativeState.ts"

export {
  /**
   * Creates OAuth account linking and unlinking services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeOAuthAccountsServices, /**
   * Table mappings, codecs, and policies for OAuth account linking, unlinking, eligibility, and cleanup.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthNativeAccountsMapping
} from "./internal/oauth/nativeAccounts.ts"

export {
  /**
   * Creates OAuth registration intents services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeOAuthRegistrationIntentServices,
  /**
   * Creates OAuth subject registration services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeOAuthRegistrationServices,
  /**
   * Table mappings, codecs, and policies for OAuth registration intents and identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthNativeRegistrationIntentMapping,
  /**
   * Table mappings, codecs, and policies for OAuth subject registration and identity ownership.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthNativeRegistrationMapping
} from "./internal/oauth/nativeRegistration.ts"

export {
  /**
   * Creates retained OAuth grants services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeOAuthConnectedServices
} from "./internal/oauth/nativeConnected.ts"
export type {
  /**
   * Table mappings, codecs, and policies for retained provider grants and guarded account policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OAuthNativeConnectedMapping
} from "./internal/oauth/nativeConnectedState.ts"

export {
  /**
   * Creates provider grant-revocation jobs services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeOAuthRevocationServices,
  /**
   * Table mappings, codecs, and policies for provider grant-revocation jobs.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthNativeRevocationMapping
} from "./internal/oauth/nativeRevocations.ts"

export {
  /**
   * Captures OAuth mapping configuration without freezing or mutating application tables, SQL
   * expressions, or effects.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  captureOAuthMapping
} from "./internal/oauth/state.ts"

export {
  /**
   * Builds a layer providing OAuth account management from an effect that creates the adapter services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthAccountsPersistenceLayer,
  /**
   * Builds a layer providing retained OAuth grants from an effect that creates the adapter services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthConnectedPersistenceLayer,
  /**
   * Builds a layer providing provider grant revocations from an effect that creates the adapter
   * services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthConnectedRevocationsLayer,
  /**
   * Builds a layer providing OAuth registration authority from an effect that creates the adapter
   * services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthRegistrationAuthorityLayer,
  /**
   * Builds a layer providing OAuth registration intents from an effect that creates the adapter
   * services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthRegistrationIntentsLayer,
  /**
   * Builds a layer providing OAuth sign-in persistence from an effect that creates the adapter services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthSignInPersistenceLayer
} from "./internal/oauth/nativeLayers.ts"

export {
  /**
   * Creates proof issuance and redemption services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeProofServices
} from "./internal/proofNative.ts"

export {
  /**
   * Creates password credential storage and management services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativePasswordServices
} from "./internal/passwordNative.ts"

export {
  /**
   * Creates password subject registration services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativePasswordRegistrationServices
} from "./internal/passwordRegistrationNative.ts"

export {
  /**
   * Storage mapping for phone number custody and sign-in credentials with application table and subject
   * ID types erased for adapter composition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyPhoneMapping, /**
   * Table mappings, codecs, and policies for phone number custody and sign-in credentials.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PhoneMapping, /**
   * Uniqueness guarantees required for phone storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredPhoneConstraints
} from "./internal/models/phoneModel.ts"

export {
  /**
   * Creates phone number custody and credential storage services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativePhoneServices
} from "./internal/phoneNative.ts"

export {
  /**
   * Creates email address verification and management services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeEmailAddressServices, /**
   * Creates email sign-in target lookup services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeEmailSignInServices
} from "./internal/emailNative.ts"

export {
  /**
   * Service contract for inspecting an email registration and committing it with proof redemption.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationAuthority,
  /**
   * Creates email subject registration with proof redemption services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeEmailRegistrationServices
} from "./internal/emailRegistrationNative.ts"

export {
  /**
   * Creates subject and credential authentication authority services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeAuthenticationAuthorityServices,
  /**
   * Table mappings, codecs, and policies for current subject and credential authentication authority.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativeAuthenticationAuthorityMapping
} from "./internal/sessionNativeAuthority.ts"

export {
  /**
   * Creates pending login authentication services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativePendingAuthenticationServices,
  /**
   * Table mappings, codecs, and policies for pending login records and authentication evidence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativePendingAuthenticationMapping
} from "./internal/sessionNativeLogin.ts"

export {
  /**
   * Creates stateful sessions services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeStatefulSessionServices,
  /**
   * Table mappings, codecs, and policies for stateful session issuance, rotation, and revocation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativeStatefulSessionMapping
} from "./internal/sessionNativeStateful.ts"

export {
  /**
   * Creates signed-session revocation validity services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeSignedSessionValidityServices,
  /**
   * Table mappings, codecs, and policies for signed-session revocation tombstones.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativeSignedSessionValidityMapping
} from "./internal/sessionNativeValidity.ts"

export {
  /**
   * Creates session step-up authentication services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeSessionStepUpServices, /**
   * Table mappings, codecs, and policies for pending session step-up authentication.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativeSessionStepUpMapping
} from "./internal/sessionNativeStepUp.ts"

export {
  /**
   * Creates expired session cleanup services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeSessionCleanupServices
} from "./internal/sessionNativeCleanup.ts"

export {
  /**
   * Uniqueness guarantees required for TOTP storage to arbitrate concurrent writes.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  requiredTotpConstraints, /**
   * Table mappings, codecs, and policies for encrypted TOTP factors, accepted steps, failure budgets,
   * and recovery codes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type TotpMapping, /**
   * TOTP mapping supplied directly or acquired through an effect during adapter setup.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type TotpMappingSource
} from "./internal/models/totpModel.ts"

export {
  /**
   * Creates TOTP factors and recovery codes services over native SQL tables.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeNativeTotpServices, /**
   * Table mappings, codecs, and policies for encrypted TOTP factors, accepted steps, failure budgets,
   * and recovery codes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type NativeTotpMapping
} from "./internal/totpNative.ts"
