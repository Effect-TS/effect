/**
 * Validation of executable documents against the schema model: only the rules
 * that decide whether generated types are correct (EFF-1829 point 5), plus
 * operation and fragment name uniqueness across all input files (EFF-1830
 * point 10).
 *
 * The signature below is the contract exercised by `test/*.test.ts`. The body
 * is a placeholder until the implementation run for EFF-1915 lands; every test
 * that reaches it fails with the error thrown here.
 *
 * @internal
 */
import type * as Ast from "./Ast.ts"
import type { Diagnostic, Source } from "./Diagnostic.ts"
import type * as SchemaModel from "./SchemaModel.ts"

/** One parsed input file. */
export interface File {
  readonly source: Source
  readonly document: Ast.Document
}

/**
 * Collects every diagnostic across `files`, ordered by file (input order) and
 * then by position. Messages follow graphql-js where it has a matching rule,
 * without its "Did you mean" suggestion lists.
 *
 * - Fields exist on their parent type (`__typename` exists on every composite
 *   type).
 * - Arguments exist; required arguments (non-null, no default) are provided.
 * - Variables are defined, used (directly or through spread fragments) and of
 *   known input types.
 * - Fragments are defined, used, acyclic, and spread onto a possible type;
 *   type conditions name known types.
 * - Operations are named. Operation names and fragment names are each unique
 *   across all files; every definition sharing a name gets one diagnostic at
 *   its name.
 * - Leaf fields have no selection set; composite fields have one.
 * - Within one selection set, fields sharing a response key select the same
 *   field with the same arguments; the later field is reported.
 *
 * Fields under an unknown field or type are not checked further. The server
 * schema is not validated, and input values are left to the runtime
 * variables `Schema`.
 */
export const validate = (
  _schema: SchemaModel.Schema,
  _files: ReadonlyArray<File>
): ReadonlyArray<Diagnostic> => {
  throw new Error("@effect/graphql-generator: Validate.validate is not implemented yet (EFF-1915)")
}
