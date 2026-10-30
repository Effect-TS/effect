import type * as Headers from "../../http/Headers.ts"
import * as InternalVersionedSchema from "../../internal/versionedSchema.ts"
import * as Rpc from "../../rpc/Rpc.ts"
import * as Schema from "../../Schema.ts"

/**
 * The versions a runner reads and answers a request at, negotiated from the
 * `effect-versions` header its sender's client set, or `undefined` when the
 * rpc uses no versioned schemas. `Rejected` when the request was written at
 * versions this runner can't read, or asks for replies at versions it can't
 * write.
 *
 * @internal
 */
export const negotiate = (
  rpc: Rpc.Any,
  headers: Headers.Headers,
  defaults?: Readonly<Record<string, number>>
):
  | {
    readonly versioning: InternalVersionedSchema.Contract
    readonly negotiated: ReturnType<typeof InternalVersionedSchema.negotiate>
  }
  | undefined =>
{
  const versioning = Rpc.getVersioning(rpc as any as Rpc.AnyWithProps)
  if (versioning === undefined) return undefined
  return {
    versioning,
    negotiated: InternalVersionedSchema.negotiate(versioning, headers[InternalVersionedSchema.header], defaults)
  }
}

/**
 * The typed version error an encoding or decoding failure of an rpc's values
 * stands for: `Unrepresentable` for a value with no equivalent at the chosen
 * versions, and `VersionUnsupported` for a record at a version this build
 * doesn't know. `undefined` for any other failure.
 *
 * @internal
 */
export const typedError = (rpc: Rpc.Any, cause: unknown): unknown => {
  if (!Schema.isSchemaError(cause)) return undefined
  const versioning = Rpc.getVersioning(rpc as any as Rpc.AnyWithProps)
  return versioning === undefined ? undefined : InternalVersionedSchema.toTypedError(versioning, cause)
}

/** @internal */
export const decode = <S extends Schema.Constraint>(rpc: Rpc.Any, schema: S) =>
  Rpc.getVersioning(rpc as any as Rpc.AnyWithProps) === undefined
    ? Schema.decodeEffect(schema)
    : InternalVersionedSchema.decodeWithVersionErrors(schema)
