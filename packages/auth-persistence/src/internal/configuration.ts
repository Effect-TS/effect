import type { EmailAction, EmailAddressPersistence } from "@effect/auth/Email"
import type { LoginIdentifier } from "@effect/auth/Identity"
import type {
  OAuthConnectedPersistence,
  OAuthConnectedPolicy,
  OAuthConnectedRevocations,
  OAuthSignInPersistence
} from "@effect/auth/OAuth"
import type {
  PasskeyActionChallenge,
  PasskeyConfig,
  PasskeyConfigurationError,
  PasskeyCredentials,
  PasskeyManagementPersistence,
  PasskeyManagementPolicy,
  PasskeyMethodPolicy,
  PasskeyPersistence
} from "@effect/auth/Passkey"
import type { PasswordAction, PasswordPersistence, PasswordUnavailable } from "@effect/auth/Password"
import type { PhoneSignInTargets } from "@effect/auth/PhoneOtp"
import type { ProofPersistence } from "@effect/auth/Proofs"
import type { SubjectId } from "@effect/auth/Schema"
import type { AuthenticationAuthority, AuthenticationRequirement, make as makeSessions } from "@effect/auth/Sessions"
import type * as Context from "effect/Context"
import type * as Digest from "effect/crypto/Digest"
import type * as SecureRandom from "effect/crypto/SecureRandom"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as SqlClient from "effect/sql/SqlClient"

import type { PersistenceMappingError } from "./mappingError.ts"
import type { IdentityImports } from "./oauth/identityImport.ts"
import type { StorageRole } from "./storageTables.ts"

export class PersistenceConfigurationError extends Schema.TaggedError<PersistenceConfigurationError>()(
  "PersistenceConfigurationError",
  { reason: Schema.String }
) {}

export type ClaimsCodec = Schema.Codec<unknown, unknown, never, never>

export interface PasskeyFeature {
  readonly kind: "passkey"
  readonly moduleId: string
  readonly policy: Effect.Effect<PasskeyMethodPolicy, PasskeyConfigurationError, PasskeyConfig>
  readonly management?: boolean
  readonly managementPolicy?: PasskeyManagementPolicy
}

export interface OAuthFeature {
  readonly kind: "oauth"
  readonly moduleId: string
  readonly signIn: boolean
  readonly connected?: OAuthConnectedPolicy
}

export interface Strategy {
  readonly strategy: object
  /** Absent metadata leaves the strategy's persistence services application-supplied. */
  readonly persistence?:
    | PasskeyFeature
    | OAuthFeature
    | {
      readonly kind: "password" | "phone" | "email"
      readonly moduleId: string
      readonly lifecycle?: boolean
      readonly management?: boolean
      readonly addresses?: boolean
    }
  readonly RegistrationAuthority?: Context.Key<unknown, unknown>
}

export interface Definition<C extends ClaimsCodec, Id extends string> {
  readonly namespace: string
  readonly claims: C
  readonly sessionMode?: string | undefined
  readonly sessions: ReturnType<typeof makeSessions<C, Id>>
  readonly strategies: Readonly<Record<string, Strategy>>
}

type KeyId<T> = T extends Context.Key<infer Id, infer _Service> ? Id : never
type Enabled<
  A extends { readonly strategies: Readonly<Record<string, Strategy>> },
  Kind extends "password" | "phone" | "email" | "passkey" | "oauth"
> = Extract<A["strategies"][keyof A["strategies"]], { persistence: { kind: Kind } }>

type ManagedPassword<A extends { readonly strategies: Readonly<Record<string, Strategy>> }> = Extract<
  Enabled<A, "password">,
  { persistence: { management: true } }
>

type ManagedPasskey<A extends { readonly strategies: Readonly<Record<string, Strategy>> }> = Extract<
  Enabled<A, "passkey">,
  { persistence: { management: true } }
>

export type PasskeyRequirement<
  A extends { readonly strategies: Readonly<Record<string, Strategy>> }
> = Enabled<A, "passkey"> extends never ? never : PasskeyConfig

type OAuthSignIn<A extends { readonly strategies: Readonly<Record<string, Strategy>> }> = Extract<
  Enabled<A, "oauth">,
  { persistence: { signIn: true } }
>

type OAuthConnected<A extends { readonly strategies: Readonly<Record<string, Strategy>> }> = Extract<
  Enabled<A, "oauth">,
  { persistence: { connected: OAuthConnectedPolicy } }
>

type RegistrationKey<S> = S extends { readonly RegistrationAuthority: infer K } ? K : never
type Registration<S> = RegistrationKey<S> extends Context.Key<infer _Id, infer Service>
  ? Service extends { readonly register: (input: infer Input, ...args: Array<never>) => unknown }
    ? Input extends { readonly registration: infer Value } ? Value
    : never
  : never
  : never

export interface ProvisioningId<Id extends string> {
  readonly authNamespace: Id
  readonly service: "PersistenceProvisioning"
}

export interface SubjectProvisioningInput<Registration> {
  readonly requestId: string
  readonly identifier: LoginIdentifier
  readonly registration: Registration
}

/** Return application subject values for insertion by the auth commit owner.
 * Include the allocated native ID, active status, and initial security revision.
 * Preparing values may allocate IDs, but must not write to the database or perform
 * external side effects. Interactive drivers also accept an existing insert callback.
 */
export type SubjectProvisioning<Registration> =
  | {
    readonly values: (
      input: SubjectProvisioningInput<Registration>
    ) => Effect.Effect<Readonly<Record<string, unknown>>, PasswordUnavailable>
  }
  | ((
    input: SubjectProvisioningInput<Registration>
  ) => Effect.Effect<SubjectId, PasswordUnavailable>)

export type Provisioning<A extends { readonly strategies: Readonly<Record<string, Strategy>> }> = {
  readonly [
    K in keyof A["strategies"] as A["strategies"][K] extends {
      persistence: { kind: "password"; management: true }
    } ? K
      : never
  ]: SubjectProvisioning<Registration<A["strategies"][K]>>
}

export type ProvisioningRequirement<
  A extends { readonly namespace: string; readonly strategies: Readonly<Record<string, Strategy>> }
> = ManagedPassword<A> extends never ? never : ProvisioningId<A["namespace"]>

type ProofRoles = "proofs"

type UsesProofs<A extends { readonly strategies: Readonly<Record<string, Strategy>> }> =
  | Enabled<A, "phone">
  | Enabled<A, "email">
  | ManagedPassword<A>

export type Ports<C extends ClaimsCodec, Id extends string, A extends Definition<C, Id>> =
  | AuthenticationAuthority
  | ("stateful" extends A["sessionMode"] ?
      | KeyId<A["sessions"]["StatefulSessionPersistence"]>
      | KeyId<A["sessions"]["SessionRepository"]>
    : never)
  | KeyId<A["sessions"]["PendingAuthentication"]>
  | KeyId<A["sessions"]["SessionStepUpPersistence"]>
  | KeyId<A["sessions"]["SessionCleanup"]>
  | (Enabled<A, "password"> extends never ? never : PasswordPersistence)
  | KeyId<RegistrationKey<ManagedPassword<A>>>
  | (Enabled<A, "passkey"> extends never ? never : PasskeyPersistence | PasskeyCredentials)
  | (ManagedPasskey<A> extends never ? never : PasskeyManagementPersistence)
  | (Enabled<A, "email"> extends never ? never : EmailAddressPersistence)
  | (UsesProofs<A> extends never ? never : ProofPersistence)
  | (Enabled<A, "phone"> extends never ? never : PhoneSignInTargets)
  | (OAuthSignIn<A> extends never ? never : OAuthSignInPersistence | IdentityImports)
  | (OAuthConnected<A> extends never ? never
    : OAuthConnectedPersistence | OAuthConnectedRevocations)

export type Roles<C extends ClaimsCodec, Id extends string, A extends Definition<C, Id>> =
  | "identifiers"
  | "credentials"
  | ("stateful" extends A["sessionMode"] ? "sessions" : never)
  | "pending"
  | (Enabled<A, "password"> extends never ? never : "passwords")
  | (Enabled<A, "email"> extends never ? never : "emailCredentials")
  | (Enabled<A, "passkey"> extends never ? never : "passkeyCredentials" | "passkeyFlows")
  | (UsesProofs<A> extends never ? never : ProofRoles)
  | (Enabled<A, "oauth"> extends never ? never : "oauthIdentities" | "oauthCredentials")
  | (OAuthSignIn<A> extends never ? never : "oauthSignInFlows")
  | (OAuthConnected<A> extends never ? never
    : "oauthConnectedFlows" | "oauthConnectedGrants" | "oauthConnectedRevocations")

export interface SubjectOptions<T extends object, NativeId> {
  readonly table: T
  readonly id: string
  readonly status: string
  readonly activeValue: unknown
  readonly securityRevision: string
  readonly idCodec: Schema.Codec<SubjectId, NativeId>
  readonly requirements: (
    row: Readonly<Record<string, unknown>>
  ) => Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
  /** Defaults to sign-in requirements. Recovery can have a distinct application policy. */
  readonly actionRequirements?: (
    row: Readonly<Record<string, unknown>>,
    action: PasswordAction | EmailAction | PasskeyActionChallenge["action"]
  ) => Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
}

/** Codecs at the application-owned subject and timestamp boundary. */
export interface SubjectMapping {
  readonly table: object
  readonly id: string
  readonly status: string
  readonly securityRevision: string
  readonly activeValue: unknown
  readonly requirements: SubjectOptions<object, unknown>["requirements"]
  readonly actionRequirements: NonNullable<SubjectOptions<object, unknown>["actionRequirements"]>
  readonly toSubject: (value: unknown) => Effect.Effect<SubjectId, PersistenceMappingError>
  readonly toNative: (value: SubjectId) => Effect.Effect<unknown, PersistenceMappingError>
  readonly toSubjectSync: (value: unknown) => SubjectId
  readonly toNativeSync: (value: SubjectId) => unknown
}

export interface MappingInput {
  readonly tables: Partial<Record<StorageRole, object>>
  readonly subjects: SubjectMapping
  readonly encodeInstant: (millis: number) => unknown
  readonly decodeInstant: (value: unknown) => Effect.Effect<number, PersistenceMappingError>
  readonly decodeInstantSync: (value: unknown) => number
}

export interface StorageLayout<
  T extends object,
  Role extends StorageRole = StorageRole
> extends MappingInput {
  readonly namespace: string
  readonly schema: Readonly<Record<Role, T>>
}

export interface ConfigId<Id extends string> {
  readonly authNamespace: Id
  readonly service: "PersistenceConfig"
}

export interface TimestampOptions<Instant> {
  readonly type: "text" | "integer"
  readonly codec: Schema.Codec<number, Instant>
}

export interface BoundPersistence<
  T extends object,
  R,
  C extends ClaimsCodec,
  Id extends string,
  A extends Definition<C, Id>
> {
  readonly Config: Context.Service<ConfigId<A["namespace"]>, StorageLayout<T, Roles<C, Id, A>>> & {
    readonly layer: (
      value: StorageLayout<T, Roles<C, Id, A>>
    ) => Layer.Layer<ConfigId<A["namespace"]>>
  }
  /** Supply subject values through `{ values }` on every driver, including D1.
   * Interactive drivers also accept callbacks that insert through the owning
   * SqlClient and return the new subject ID. Never open an independent transaction
   * or perform external side effects while preparing a subject.
   */
  readonly Provisioning: Context.Service<ProvisioningRequirement<A>, Provisioning<A>>
  /** Stateful sessions and OAuth-only stateless sessions are supported. Other session
   * configurations fail acquisition with PersistenceConfigurationError.
   * Capture dependencies at acquisition; validate SQL metadata and configure storage
   * once on the first service operation. The configured SQL client's acquirer can
   * resolve services from that operation's request context. Initialization failures become
   * that port's unavailable error until layer reacquisition. Canceling a caller leaves initialization
   * running for other waiting callers; if initialization is interrupted, later operations
   * remain unavailable until layer reacquisition.
   * Managed OAuth metadata/token-use authorizations bind policyRevision to the subject's
   * securityRevision; changes to application authorization policy must advance it.
   */
  readonly layer: Layer.Layer<
    Ports<C, Id, A>,
    PersistenceConfigurationError,
    | Digest.Digest
    | SecureRandom.SecureRandom
    | ConfigId<A["namespace"]>
    | ProvisioningRequirement<A>
    | PasskeyRequirement<A>
    | SqlClient.SqlClient
    | R
  >
  readonly managed: <N, Instant = number>(options: {
    readonly subjects: SubjectOptions<T, N>
    readonly tables?: Partial<Record<Roles<C, Id, A>, T>>
    /** Stable SQL identifier prefix; reuse the deployed prefix for existing tables. */
    readonly prefix: string
    readonly timestamps?: TimestampOptions<Instant>
  }) => StorageLayout<T, Roles<C, Id, A>>
  readonly map: <N, Instant = number>(options: {
    readonly subjects: SubjectOptions<T, N>
    readonly tables: Readonly<Record<Roles<C, Id, A>, T>>
    readonly timestamps?: TimestampOptions<Instant>
  }) => StorageLayout<T, Roles<C, Id, A>>
}

/** Shared configuration shape. The backend chooses table types and service requirements. */
export interface PersistenceApi<T extends object, R = never> {
  readonly make: <
    C extends ClaimsCodec,
    const Id extends string,
    const A extends Definition<C, Id>
  >(
    auth: A & Definition<C, Id>
  ) => BoundPersistence<T, R, C, Id, A>
}
