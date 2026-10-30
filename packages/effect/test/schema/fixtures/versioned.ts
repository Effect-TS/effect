/**
 * The same versioned types as three builds see them: an older client, the
 * current server, and a newer client. Each build extends the previous one's
 * declarations, as separately deployed programs sharing a types package do.
 */
import { Schema } from "effect"
import { VersionedSchema } from "effect/schema"

const AddressV1 = VersionedSchema.make("Address", {
  version: 1,
  payload: Schema.Struct({ street: Schema.String })
})

const AddressV2 = AddressV1.next({
  version: 2,
  payload: Schema.Struct({ street: Schema.String, city: Schema.optionalKey(Schema.String) }),
  migration: (s) => s.addField("city")
})

const PersonV1 = VersionedSchema.make("Person", {
  version: 1,
  payload: Schema.Struct({ name: Schema.String, status: Schema.Literals(["active", "suspended"]), address: AddressV1 })
})

const PersonV2 = PersonV1.next({
  version: 2,
  payload: Schema.Struct({
    fullName: Schema.String,
    status: Schema.Literals(["active", "suspended"]),
    email: Schema.optionalKey(Schema.String),
    address: AddressV2
  }),
  migration: (s) => s.renameField("name", "fullName").addField("email")
})

const PersonV3 = PersonV2.next({
  version: 3,
  payload: Schema.Struct({
    fullName: Schema.String,
    status: Schema.Literals(["active", "suspended", "archived"]),
    email: Schema.optionalKey(Schema.String),
    address: AddressV2
  }),
  migration: (s) =>
    s.mapField("status", {
      up: (status) => status,
      down: (status) =>
        status === "archived" ? VersionedSchema.unrepresentable("archived people need Person v3") : status
    })
})

const PersonV4 = PersonV3.next({
  version: 4,
  payload: Schema.Struct({
    fullName: Schema.String,
    status: Schema.Literals(["active", "suspended", "archived"]),
    email: Schema.optionalKey(Schema.String),
    phone: Schema.optionalKey(Schema.String),
    address: AddressV2
  }),
  migration: (s) => s.addField("phone")
})

const conflict = <P extends Schema.Top>(person: P) =>
  Schema.TaggedStruct("Conflict", { current: person }).annotate({ httpApiStatus: 409 })

/** a client built before Address v2 and Person v2 */
export const Old = { Address: AddressV1, Person: PersonV1, Conflict: conflict(PersonV1) }

/** the server */
export const Current = { Address: AddressV2, Person: PersonV3, Conflict: conflict(PersonV3) }

/** a client built after the server, with Person v4 */
export const Next = { Address: AddressV2, Person: PersonV4, Conflict: conflict(PersonV4) }

export type Person = typeof PersonV3.Type

export const ada: Person = {
  fullName: "Ada",
  status: "active",
  email: "ada@example.com",
  address: { street: "1 Main St", city: "London" }
}

export const archived: Person = {
  fullName: "Grace",
  status: "archived",
  address: { street: "2 High St" }
}

const Badge = VersionedSchema.make("Badge", { version: 1, payload: Schema.Struct({ label: Schema.String }) })

const Level = (child: () => Schema.Codec<unknown>): Schema.Codec<unknown> =>
  Schema.Struct({ id: Schema.String, children: Schema.Array(Schema.suspend(child)) })

/**
 * A hierarchy whose five levels look alike, which hides its badges from the
 * search for versioned types.
 */
export const Org = Level(() => Level(() => Level(() => Level(() => Level(() => Badge)))))

const level = (id: string, child: unknown) => ({ id, children: [child] })

export const org = level("a", level("b", level("c", level("d", level("e", { label: "staff" })))))

/** `org` encoded */
export const orgEncoded = level("a", level("b", level("c", level("d", level("e", { _version: 1, label: "staff" })))))
