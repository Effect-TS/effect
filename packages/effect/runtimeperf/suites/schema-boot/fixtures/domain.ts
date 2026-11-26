import * as Schema from "effect/Schema"

// Definitions shared by every entity, as an application's common models would be.
export const makeCore = () => {
  const Id = Schema.String.check(Schema.isMinLength(1)).pipe(Schema.brand("Id"))
  const Address = Schema.Struct({
    street: Schema.String,
    city: Schema.String,
    country: Schema.Literals(["IT", "US", "DE", "FR"]),
    zip: Schema.optionalKey(Schema.String)
  })
  const Money = Schema.Struct({
    amount: Schema.NumberFromString.check(Schema.isGreaterThanOrEqualTo(0)),
    currency: Schema.Literals(["EUR", "USD"])
  })
  interface Tree {
    readonly value: number
    readonly children: ReadonlyArray<Tree>
  }
  const Tree = Schema.Struct({
    value: Schema.Number,
    children: Schema.Array(Schema.suspend((): Schema.Codec<Tree> => Tree))
  })
  const User = Schema.Struct({
    id: Id,
    name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
    email: Schema.String.check(Schema.isPattern(/^[^@]+@[^@]+$/)),
    address: Schema.optionalKey(Address)
  })
  return { Id, Address, Money, Tree, User }
}

export type Core = ReturnType<typeof makeCore>

export const makeEntity = (core: Core, index: number) => {
  const Entity = Schema.Struct({
    id: core.Id,
    kind: Schema.Literal(`entity${index}`),
    name: Schema.String.check(Schema.isMinLength(1)),
    count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    price: core.Money,
    createdAt: Schema.DateFromString,
    tags: Schema.Array(Schema.String),
    owner: core.User,
    address: Schema.optionalKey(core.Address),
    status: Schema.Literals(["active", "archived", "draft"]),
    tree: Schema.optionalKey(core.Tree),
    meta: Schema.Record(Schema.String, Schema.Unknown)
  })
  const Event = Schema.Union([
    Schema.TaggedStruct("Created", { entity: Entity }),
    Schema.TaggedStruct("Renamed", { id: core.Id, name: Schema.String }),
    Schema.TaggedStruct("Deleted", { id: core.Id, at: Schema.DateFromString })
  ])
  return { Entity, Event }
}

export const entityInput = (index: number) => ({
  id: `id-${index}`,
  kind: `entity${index}`,
  name: "Ada",
  count: 1,
  price: { amount: "12.5", currency: "EUR" },
  createdAt: "2024-01-01T00:00:00.000Z",
  tags: ["a", "b"],
  owner: {
    id: "u1",
    name: "Grace",
    email: "grace@example.com",
    address: { street: "Main", city: "Rome", country: "IT" }
  },
  status: "active",
  tree: { value: 1, children: [{ value: 2, children: [] }] },
  meta: { source: "import" }
})
