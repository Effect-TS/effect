import type * as Context from "effect/Context"

/** The strict function property also checks class-style keys: the adapter's
 * constructed value must satisfy the selected service, including native relations. */
export type SuppliedService<Id, Constructed, Selected = Constructed> =
  & Context.Service<
    Id,
    Selected
  >
  & {
    readonly of: (value: Constructed) => Selected
  }
