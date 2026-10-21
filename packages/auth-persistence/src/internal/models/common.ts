import type { SubjectId } from "@effect/auth/Schema"
import type * as Effect from "effect/Effect"

import type { PersistenceMappingError } from "../mappingError.ts"
export type { PersistenceMappingError } from "../mappingError.ts"

export interface SubjectIdCodec<NativeId> {
  readonly toNative: (id: SubjectId) => Effect.Effect<NativeId, PersistenceMappingError>
  readonly toSubject: (id: NativeId) => Effect.Effect<SubjectId, PersistenceMappingError>
  readonly equals: (left: NativeId, right: NativeId) => boolean
}
