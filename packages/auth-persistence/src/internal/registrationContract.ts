import type { PreparedCommit } from "@effect/auth/Hooks"
import type { LoginIdentifier } from "@effect/auth/Identity"
import type {
  PasswordRegistrationDecision,
  PasswordReplacement,
  PasswordUnavailable,
  PreparePasswordCommit
} from "@effect/auth/Password"
import type * as Effect from "effect/Effect"

export interface PasswordRegistrationAuthority<Registration> {
  readonly register: <A>(
    input: {
      readonly moduleId: string
      readonly requestId: string
      readonly identifier: LoginIdentifier
      readonly registration: Registration
      readonly replacement: PasswordReplacement
    },
    prepare: PreparePasswordCommit<PasswordRegistrationDecision, A>
  ) => Effect.Effect<PreparedCommit<A>, PasswordUnavailable>
}
