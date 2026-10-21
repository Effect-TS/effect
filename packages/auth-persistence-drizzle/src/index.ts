/**
 * Drizzle table mappings, storage constraints, and service layers for Effect Auth persistence.
 *
 * @stability unstable
 * @since 4.1.0
 */
export type {
  /**
   * Column mapping for callback proxy requests, expiration, and one-time consumption.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OAuthProxyColumns
} from "./internal/drizzle/oauthProxy.ts"

export {
  /**
   * Table and column mappings used to execute email address operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyEmailAddressMapping,
  /**
   * Table and column mappings used to execute email registration operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyEmailRegistrationMapping,
  /**
   * Table and column mappings used to execute email sign in operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyEmailSignInMapping,
  /**
   * Table and column mappings used to execute email address operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailAddressMapping,
  /**
   * Table and column roles required to store email authority credential records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailAuthorityCredentialTable,
  /**
   * Table and column roles required to store email credential read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailCredentialReadTable,
  /**
   * Table and column roles required to store email credential records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailCredentialTable,
  /**
   * Table and column roles required to store email identifier read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailIdentifierReadTable,
  /**
   * Table and column roles required to store email identifier records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailIdentifierTable,
  /**
   * Table and column roles required to store email registration authority credential records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationAuthorityCredentialTable,
  /**
   * Table and column roles required to store email registration credential records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationCredentialTable,
  /**
   * Table and column roles required to store email registration identifier records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationIdentifierTable,
  /**
   * Application registration intent consumed when email provisioning commits.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationIntent,
  /**
   * Table and column mappings used to execute email registration operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationMapping,
  /**
   * Application provisioning callbacks run within the email registration transaction.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationProvisioning,
  /**
   * Table and column mappings used to execute email sign in operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailSignInMapping,
  /**
   * Table and column roles required to store email subject read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailSubjectReadTable,
  /**
   * Table and column roles required to store email subject records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailSubjectTable,
  /**
   * Constraint names and columns required by email address persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredEmailAddressConstraints,
  /**
   * Unique keys and relationships that email address storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredEmailAddressConstraints,
  /**
   * Constraint names and columns required by email registration persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredEmailRegistrationConstraints,
  /**
   * Unique keys and relationships that email registration storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredEmailRegistrationConstraints,
  /**
   * Constraint names and columns required by email sign in persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredEmailSignInConstraints,
  /**
   * Unique keys and relationships that email sign in storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredEmailSignInConstraints
} from "./internal/drizzle/emailModel.ts"

export {
  /**
   * Table and column mappings used to execute password persistence operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyPasswordPersistenceMapping,
  /**
   * Table and column mappings used to execute password registration operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyPasswordRegistrationMapping,
  /**
   * Table and column roles required to store password authority credential records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordAuthorityCredentialTable,
  /**
   * Table and column roles required to store password credential records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordCredentialTable,
  /**
   * Table and column roles required to store password identifier records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordIdentifierTable,
  /**
   * Table and column mappings used to execute password persistence operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordPersistenceMapping,
  /**
   * Classifier that identifies password registration uniqueness conflicts from driver errors.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationConstraintClassifier,
  /**
   * Application registration intent consumed when password provisioning commits.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationIntent,
  /**
   * Table and column mappings used to execute password registration operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationMapping,
  /**
   * Application provisioning callbacks run within the password registration transaction.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationProvisioning,
  /**
   * Table and column roles required to store password subject records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordSubjectTable,
  /**
   * Constraint names and columns required by password persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredPasswordConstraints,
  /**
   * Unique keys and relationships that password storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredPasswordConstraints,
  /**
   * Constraint names and columns required by password registration persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredPasswordRegistrationConstraints,
  /**
   * Unique keys and relationships that password registration storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredPasswordRegistrationConstraints
} from "./internal/drizzle/passwordModel.ts"

export {
  /**
   * Table and column mappings used to execute proof persistence operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyProofPersistenceMapping,
  /**
   * Database clock expressions and timestamp conversions used by proof operations.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofClock,
  /**
   * Table and column mappings used to execute proof persistence operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofPersistenceMapping,
  /**
   * Table and column roles required to store proof records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProofTable,
  /**
   * Constraint names and columns required by proof persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredProofConstraints,
  /**
   * Unique keys and relationships that proof storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredProofConstraints
} from "./internal/drizzle/proofModel.ts"

export {
  /**
   * Table and column mappings used to execute D1 external identity operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type D1ExternalIdentityMapping,
  /**
   * D1 subject mapping with application-generated native identifiers for atomic batch insertion.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type D1GeneratedIdentityMapping,
  /**
   * Table and column mappings used to execute D1 subject provisioning operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type D1SubjectProvisioningMapping,
  /**
   * Application tables and columns required for external identity persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ExternalIdentityTables,
  /**
   * Layer that provides subject provisioning and external identity services from their acquired implementations.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  identityServicesLayer,
  /**
   * Application tables and columns required for identity persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type IdentityTables,
  /**
   * Codec that converts application timestamps to and from the database's timestamp representation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type InstantCodec,
  /**
   * Checks whether a database failure matches a declared unique constraint in the table mapping.
   *
   * @stability unstable
   * @category guards
   * @since 4.1.0
   */
  isMappedConstraintConflict,
  /**
   * Error raised when a table mapping or database operation cannot satisfy the persistence contract.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PersistenceMappingError,
  /**
   * Constraint names and columns required by external identity persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredExternalIdentityConstraints,
  /**
   * Unique keys and relationships that external identity storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredExternalIdentityConstraints,
  /**
   * Constraint names and columns required by identity persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredIdentityConstraints,
  /**
   * Unique keys and relationships that identity storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredIdentityConstraints,
  /**
   * Constraint names and columns required by subject provisioning persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredSubjectProvisioningConstraints,
  /**
   * Unique keys and relationships that subject provisioning storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredSubjectProvisioningConstraints,
  /**
   * Codec that translates application subject identifiers to the database's native identifier type.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SubjectIdCodec,
  /**
   * Application tables and columns required for subject provisioning persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SubjectProvisioningTables
} from "./internal/drizzle/model.ts"

export {
  /**
   * Table and column mappings used to execute authentication authority operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthenticationAuthorityMapping,
  /**
   * Table and column mappings used to execute pending authentication operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PendingAuthenticationMapping,
  /**
   * Application tables and columns required for pending authentication persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PendingAuthenticationTables,
  /**
   * Constraint names and columns required by pending authentication persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredPendingAuthenticationConstraints,
  /**
   * Unique keys and relationships that pending authentication storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredPendingAuthenticationConstraints,
  /**
   * Constraint names and columns required by session persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredSessionConstraints,
  /**
   * Unique keys and relationships that session storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredSessionConstraints,
  /**
   * Constraint names and columns required by signed validity persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredSignedValidityConstraints,
  /**
   * Unique keys and relationships that signed validity storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredSignedValidityConstraints,
  /**
   * Constraint names and columns required by stateful pending persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredStatefulPendingConstraints,
  /**
   * Unique keys and relationships that stateful pending storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredStatefulPendingConstraints,
  /**
   * Application tables and columns required for session authority persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionAuthorityTables,
  /**
   * Table and column mappings used to execute session cleanup operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionCleanupMapping,
  /**
   * Codec that translates session identifiers to and from their stored representation.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionIdCodec,
  /**
   * Values inserted when storing a new session pending record.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionPendingInsert,
  /**
   * Application tables and columns required for session pending persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionPendingTables,
  /**
   * Application tables and columns required for session subject persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionSubjectTables,
  /**
   * Table and column mappings used to execute signed session validity operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SignedSessionValidityMapping,
  /**
   * Application tables and columns required for signed session validity persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SignedSessionValidityTables,
  /**
   * Table and column mappings used to execute stateful session operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StatefulSessionMapping,
  /**
   * Application tables and columns required for stateful session persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StatefulSessionTables
} from "./internal/drizzle/sessionModel.ts"

export {
  /**
   * Table and column mappings used to execute D1 passkey operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type D1PasskeyMapping,
  /**
   * Table and column mappings used to execute passkey ceremony operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCeremonyMapping,
  /**
   * Database clock expressions and timestamp conversions used by passkey operations.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyClock,
  /**
   * Column descriptor used to address a value in a mapped passkey table.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyColumn,
  /**
   * Table and column mappings used to execute passkey credential operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCredentialMapping,
  /**
   * Table and column roles required to store passkey credential read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCredentialReadTable,
  /**
   * Acquired passkey credential services bound to the mapped database tables.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCredentialServices,
  /**
   * Layer that provides passkey credentials from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  passkeyCredentialsLayer,
  /**
   * Table and column roles required to store passkey factor read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyFactorReadTable,
  /**
   * Values inserted when storing a new passkey flow record.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyFlowInsert,
  /**
   * Table and column roles required to store passkey flow records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyFlowTable,
  /**
   * A passkey table mapping or an effect that acquires that mapping.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyMappingSource,
  /**
   * Layer that provides passkey persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  passkeyPersistenceLayer,
  /**
   * Table and column mappings used to execute passkey persistence operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyPersistenceMapping,
  /**
   * Acquired passkey persistence services bound to the mapped database tables.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyPersistenceServices,
  /**
   * Codec that translates passkey subject identifiers to the database's native identifier type.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeySubjectIdCodec,
  /**
   * Table and column roles required to store passkey subject read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeySubjectReadTable,
  /**
   * Unique keys and relationships that passkey credential storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredPasskeyCredentialConstraints,
  /**
   * Unique keys and relationships that passkey persistence storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredPasskeyPersistenceConstraints
} from "./internal/drizzle/passkeyModel.ts"

export {
  /**
   * Constraint names and columns required by session step up persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type RequiredSessionStepUpConstraints,
  /**
   * Unique keys and relationships that session step up storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredSessionStepUpConstraints,
  /**
   * Table and column mappings used to execute session step up operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionStepUpMapping,
  /**
   * Application tables and columns required for session step up source persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionStepUpSourceTables
} from "./internal/drizzle/stepUpModel.ts"

export {
  /**
   * Table and column mappings used to execute OAuth accounts operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAccountsMapping,
  /**
   * OAuth persistence action used to select the applicable transaction policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAction,
  /**
   * Table and column roles required to store OAuth authority read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAuthorityReadTable,
  /**
   * Table and column roles required to store OAuth authority records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthAuthorityTable,
  /**
   * Table columns and predicates used for OAuth cleanup checks.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCleanupDescriptor,
  /**
   * Table and column roles required to store OAuth cleanup records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCleanupTable,
  /**
   * Creates an OAuth cleanup table descriptor with its scope and expiration columns.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthCleanupTable,
  /**
   * Database clock expressions and timestamp conversions used by OAuth operations.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthClock,
  /**
   * Table and column roles required to store OAuth credential read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCredentialReadTable,
  /**
   * Table and column roles required to store OAuth credential records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthCredentialTable,
  /**
   * Table and column mappings used to execute OAuth D1 operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthD1Mapping,
  /**
   * Table columns and predicates used for OAuth eligibility checks.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityDescriptor,
  /**
   * Database fact evaluated when checking OAuth eligibility before commit.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityFact,
  /**
   * Table and column roles required to store OAuth eligibility records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthEligibilityTable,
  /**
   * Creates an OAuth eligibility descriptor for the facts checked before committing an operation.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthEligibilityTable,
  /**
   * Table and column roles required to store OAuth flow records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthFlowTable,
  /**
   * Table and column roles required to store OAuth ownership read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthOwnershipReadTable,
  /**
   * Table and column roles required to store OAuth ownership records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthOwnershipTable,
  /**
   * Authority that provisions application data with a new OAuth identity in one commit.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationAuthority,
  /**
   * Table columns and predicates used for OAuth registration guard checks.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationGuardDescriptor,
  /**
   * Table and column roles required to store OAuth registration guard records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationGuardTable,
  /**
   * Creates an OAuth registration guard descriptor for account ownership checks.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  oauthRegistrationGuardTable,
  /**
   * Table and column mappings used to execute OAuth registration intent operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationIntentMapping,
  /**
   * Table and column roles required to store OAuth registration intent records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationIntentTable,
  /**
   * Table and column mappings used to execute OAuth registration operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthRegistrationMapping,
  /**
   * Table and column mappings used to execute OAuth sign in operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSignInMapping,
  /**
   * Table and column roles required to store OAuth subject read records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSubjectReadTable,
  /**
   * Table and column roles required to store OAuth subject records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthSubjectTable,
  /**
   * Unique keys and relationships that OAuth registration storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredOAuthRegistrationConstraints,
  /**
   * Unique keys and relationships that OAuth sign in storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredOAuthSignInConstraints
} from "./internal/drizzle/oauthModel.ts"

export {
  /**
   * Retained OAuth grant action used to select the applicable transaction policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedAction,
  /**
   * Table and column roles required to store OAuth connected grant records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedGrantTable,
  /**
   * Table and column mappings used to execute OAuth connected operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedMapping,
  /**
   * Input facts used to construct SQL guards for retained OAuth grants.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedPolicyInput,
  /**
   * Table and column roles required to store OAuth connected revocation job records.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedRevocationJobTable,
  /**
   * Table and column mappings used to execute OAuth connected revocation operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedRevocationMapping,
  /**
   * SQL predicates that guard retained OAuth grant changes at commit time.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type OAuthConnectedSqlPolicy,
  /**
   * Unique keys and relationships that OAuth connected storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredOAuthConnectedConstraints,
  /**
   * Unique keys and relationships that OAuth connected revocation storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredOAuthConnectedRevocationConstraints
} from "./internal/drizzle/oauthConnectedModel.ts"

export {
  /**
   * Database capabilities required to store and consume passkey registration ceremonies.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationCeremonyCapabilities,
  /**
   * Table and column mappings used to execute passkey registration ceremony operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationCeremonyMapping,
  /**
   * Acquired passkey registration ceremony services bound to the mapped database tables.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationCeremonyServices
} from "./internal/drizzle/passkeyRegistrationCeremonyModel.ts"

export {
  /**
   * Layer that provides email address persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  emailAddressPersistenceLayer,
  /**
   * Layer that provides email registration from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  emailRegistrationLayer,
  /**
   * Layer that provides email sign in targets from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  emailSignInTargetsLayer
} from "./internal/drizzle/emailTarget.ts"

export {
  /**
   * Layer that provides OAuth accounts persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthAccountsPersistenceLayer,
  /**
   * Layer that provides OAuth registration authority from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthRegistrationAuthorityLayer,
  /**
   * Layer that provides OAuth registration intents from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthRegistrationIntentsLayer,
  /**
   * Layer that provides OAuth sign in persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthSignInPersistenceLayer
} from "./internal/drizzle/oauthTarget.ts"

export {
  /**
   * Returns the ownership references used to validate retained OAuth grants.
   *
   * @stability unstable
   * @category getters
   * @since 4.1.0
   */
  oauthConnectedOwnershipReferences
} from "./internal/drizzle/oauthConnectedReference.ts"

export {
  /**
   * Layer that provides OAuth connected persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthConnectedPersistenceLayer,
  /**
   * Layer that provides OAuth connected revocations from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  oauthConnectedRevocationsLayer
} from "./internal/drizzle/oauthTarget.ts"

export {
  /**
   * Layer that provides password persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  passwordPersistenceLayer,
  /**
   * Layer that provides password registration from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  passwordRegistrationLayer
} from "./internal/drizzle/passwordTarget.ts"
export {
  /**
   * Layer that provides proof persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  proofPersistenceLayer
} from "./internal/drizzle/proofTarget.ts"

export {
  /**
   * Unique keys and relationships that TOTP storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredTotpConstraints,
  /**
   * Table and column mappings used to execute TOTP operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type TotpMapping,
  /**
   * A TOTP table mapping or an effect that acquires that mapping.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type TotpMappingSource,
  /**
   * Layer that provides TOTP persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  totpPersistenceLayer,
  /**
   * Acquired TOTP persistence services bound to the mapped database tables.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type TotpPersistenceServices
} from "./internal/drizzle/totpModel.ts"

export {
  /**
   * Values inserted when storing a new passkey credential record.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyCredentialInsert,
  /**
   * Credential identity and revision required to invalidate a stored passkey.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyInvalidationInput,
  /**
   * Mutation that invalidates a mapped passkey only while its expected revision is current.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyInvalidationMutation,
  /**
   * Creates a passkey invalidation mutation for a mapped credential and its revision.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  passkeyInvalidationMutation,
  /**
   * Table and column mappings used to execute passkey management operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyManagementMapping,
  /**
   * Acquired passkey management services bound to the mapped database tables.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyManagementServices,
  /**
   * Table and column mappings used to execute passkey registration operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationMapping,
  /**
   * Acquired passkey registration services bound to the mapped database tables.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationServices,
  /**
   * Writer that commits application registration data with the passkey credential in one transaction.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationWriter,
  /**
   * Application tables and columns required for passkey write persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyWriteTables
} from "./internal/drizzle/passkeyWriteModel.ts"

export {
  /**
   * Layer that provides passkey management persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  passkeyManagementPersistenceLayer
} from "./internal/drizzle/passkey/writeTarget.ts"

export {
  /**
   * Table and column mappings used to execute phone operations against the application database.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PhoneMapping,
  /**
   * A phone table mapping or an effect that acquires that mapping.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PhoneMappingSource,
  /**
   * Layer that provides phone persistence from the acquired mapped services.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  phonePersistenceLayer,
  /**
   * Acquired phone persistence services bound to the mapped database tables.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PhonePersistenceServices,
  /**
   * Unique keys and relationships that phone storage must provide.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  requiredPhoneConstraints
} from "./internal/drizzle/phoneModel.ts"
