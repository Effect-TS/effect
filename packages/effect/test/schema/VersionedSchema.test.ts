import { assert, describe, it } from "@effect/vitest"
import { Effect, Result, Schema, type SchemaIssue, SchemaTransformation } from "effect"
import { SchemaBinary } from "effect/encoding"
import * as InternalVersionedSchema from "effect/internal/versionedSchema"
import { VersionedSchema } from "effect/schema"
import { ada, archived, Current, Old } from "./fixtures/versioned.ts"

const Person = Current.Person

const encodeAt = <S extends Schema.Codec<any, unknown>>(schema: S, versions: VersionedSchema.Versions) =>
  Schema.encodeSync(VersionedSchema.at(schema, versions))

const failure = (result: Result.Result<unknown, Schema.SchemaError>) => {
  assert.isTrue(Result.isFailure(result))
  return (result as Result.Failure<unknown, Schema.SchemaError>).failure
}

describe("VersionedSchema", () => {
  describe("decoding", () => {
    it("reads every declared version into the latest version's plain type", () => {
      const v1 = { _version: 1, name: "Ada", status: "active", address: { _version: 1, street: "1 Main St" } }
      const v3 = {
        _version: 3,
        fullName: "Ada",
        status: "archived",
        address: { _version: 2, street: "1 Main St", city: "London" }
      }
      assert.deepStrictEqual(Schema.decodeUnknownSync(Person)(v1), {
        fullName: "Ada",
        status: "active",
        address: { street: "1 Main St" }
      })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Person)(v3), {
        fullName: "Ada",
        status: "archived",
        address: { street: "1 Main St", city: "London" }
      })
    })

    it.effect("classifies transformed stored records once without retaining parser inputs", () =>
      Effect.gen(function*() {
        let decoded = 0
        const codec = Schema.toCodecJson(Schema.Struct({
          item: Schema.String.pipe(
            Schema.decodeTo(
              Schema.String,
              SchemaTransformation.transform({
                decode: (value) => {
                  decoded++
                  return value
                },
                encode: (value) => value
              })
            ),
            Schema.decodeTo(Schema.fromJsonString(Person))
          )
        }))
        const decode = InternalVersionedSchema.decodeWithVersionErrors(codec)
        const checkNoInput = (issue: SchemaIssue.Issue) => {
          assert.isFalse(Object.hasOwn(issue, "input"))
          if ("issue" in issue) checkNoInput(issue.issue)
          if ("issues" in issue) issue.issues.forEach(checkNoInput)
        }
        for (const version of [9, 3]) {
          const error = yield* Effect.flip(decode({ item: JSON.stringify({ _version: version, fullName: "secret" }) }))
          assert.deepStrictEqual(
            InternalVersionedSchema.findUnsupported(error.issue),
            version === 9 ? { id: "Person", requested: 9 } : undefined
          )
          checkNoInput(error.issue)
          assert.notInclude(error.message, "secret")
        }
        assert.strictEqual(decoded, 2)
      }))

    it("constructs class payloads, without the version field", () => {
      class PersonV2 extends Schema.Class<PersonV2>("PersonV2")({ fullName: Schema.String }) {}
      const ClassPerson = VersionedSchema.make("Person", {
        version: 1,
        payload: Schema.Struct({ name: Schema.String })
      }).next({ version: 2, payload: PersonV2, migration: (s) => s.renameField("name", "fullName") })

      const decoded = Schema.decodeUnknownSync(ClassPerson)({ _version: 1, name: "Ada" })
      assert.instanceOf(decoded, PersonV2)
      assert.deepStrictEqual(Object.keys(decoded), ["fullName"])
      assert.deepStrictEqual(Schema.encodeSync(ClassPerson)(new PersonV2({ fullName: "Ada" })), {
        _version: 2,
        fullName: "Ada"
      })
    })

    it("rejects records of an unknown version or without one, naming the versions it reads", () => {
      const message = (input: unknown) => failure(Schema.decodeUnknownResult(Person)(input)).message
      assert.strictEqual(message({ _version: 9, fullName: "Ada" }), "Expected Person with _version 1, 2 or 3")
      assert.strictEqual(message({ fullName: "Ada", status: "active" }), "Expected Person with _version 1, 2 or 3")
      assert.strictEqual(
        message({ _version: 3, fullName: "Ada", status: "active", address: { _version: 7, street: "x" } }),
        "Expected Address with _version 1 or 2\n  at [\"address\"]"
      )
    })

    it("an older declaration doesn't read newer versions", () => {
      const result = Schema.decodeUnknownResult(Old.Person)({
        _version: 2,
        fullName: "Ada",
        status: "active",
        address: { _version: 1, street: "x" }
      })
      assert.strictEqual(failure(result).message, "Expected Person with _version 1")
    })

    it("records are encoded like their payloads, so non-JSON values stay values until a JSON codec", () => {
      const Event = VersionedSchema.make("Event", { version: 1, payload: Schema.Struct({ at: Schema.Date }) })
      const at = new Date(0)
      assert.deepStrictEqual(Schema.encodeSync(Event)({ at }), { _version: 1, at })
      assert.deepStrictEqual(Schema.encodeSync(Schema.toCodecJson(Event))({ at }), {
        _version: 1,
        at: "1970-01-01T00:00:00.000Z"
      })
      assert.deepStrictEqual(
        Schema.decodeUnknownSync(Schema.toCodecJson(Event))({ _version: 1, at: "1970-01-01T00:00:00.000Z" }),
        { at }
      )
    })
  })

  describe("encoding", () => {
    it("writes the latest version", () => {
      assert.deepStrictEqual(Schema.encodeSync(Person)(ada), {
        _version: 3,
        fullName: "Ada",
        status: "active",
        email: "ada@example.com",
        address: { _version: 2, street: "1 Main St", city: "London" }
      })
    })

    it("at writes older versions, including nested types", () => {
      assert.deepStrictEqual(
        encodeAt(Person, VersionedSchema.versions(Person.version(1), Current.Address.version(1)))(ada),
        {
          _version: 1,
          name: "Ada",
          status: "active",
          address: { _version: 1, street: "1 Main St" }
        }
      )
      // a missing id is written at its latest version
      assert.deepStrictEqual(encodeAt(Person, Person.version(2))(ada), {
        _version: 2,
        fullName: "Ada",
        status: "active",
        email: "ada@example.com",
        address: { _version: 2, street: "1 Main St", city: "London" }
      })
    })

    it("versions come from the schemas, and a type given twice gets its last version", () => {
      const versions = VersionedSchema.versions(Person.version(1), Current.Address.version(1), Person.version(2))
      assert.deepStrictEqual<Readonly<Record<string, number>>>(versions, { Person: 2, Address: 1 })
      assert.isTrue(Object.isFrozen(versions))
      // for casts and JavaScript callers, which the types don't check
      assert.throws(
        () => Person.version(9 as never),
        "VersionedSchema Person: version 9 isn't declared (declared: 1, 2, 3)"
      )
    })

    it("at applies to versioned types inside other schemas", () => {
      const Team = Schema.Struct({ members: Schema.Array(Person) })
      assert.deepStrictEqual(encodeAt(Team, Current.Address.version(1))({ members: [archived] }), {
        members: [{ _version: 3, fullName: "Grace", status: "archived", address: { _version: 1, street: "2 High St" } }]
      })
    })

    it("at uses the newest declared version at or below the one asked for", () => {
      // versions only a server can send, which this build's types can't check
      const sent = (version: number) => ({ Gapped: version }) as unknown as VersionedSchema.Versions
      const Gapped = VersionedSchema.make("Gapped", { version: 1, payload: Schema.Struct({ a: Schema.String }) })
        .next({ version: 5, payload: Schema.Struct({ b: Schema.String }), migration: (s) => s.renameField("a", "b") })
      assert.deepStrictEqual(encodeAt(Gapped, sent(3))({ b: "x" }), { _version: 1, a: "x" })
      assert.deepStrictEqual(encodeAt(Gapped, sent(9))({ b: "x" }), { _version: 5, b: "x" })
      const older = Schema.encodeResult(VersionedSchema.at(Gapped, sent(0)))({ b: "x" })
      assert.deepStrictEqual(InternalVersionedSchema.findUnsupported(failure(older).issue), {
        id: "Gapped",
        requested: 0
      })
    })

    it("fails clearly when a value has no equivalent in the older version", () => {
      const result = Schema.encodeResult(VersionedSchema.at(Person, Person.version(2)))(archived)
      const unrepresentable = InternalVersionedSchema.findUnrepresentable(failure(result).issue)
      assert.deepStrictEqual(unrepresentable, {
        id: "Person",
        version: 2,
        reason: "Person can't be written at v2: archived people need Person v3"
      })
    })

    it("a nested at overrides only the versions it names", () => {
      const Pinned = Schema.Struct({ person: VersionedSchema.at(Person, Person.version(1)) })
      assert.deepStrictEqual(
        encodeAt(Pinned, VersionedSchema.versions(Current.Address.version(1), Person.version(3)))({ person: ada }),
        {
          person: { _version: 1, name: "Ada", status: "active", address: { _version: 1, street: "1 Main St" } }
        }
      )
    })

    it("older decoded refinements and encoded constraints fail with Unrepresentable", () => {
      const Integer = VersionedSchema.make("Integer", {
        version: 1,
        payload: Schema.Struct({ n: Schema.Int })
      }).next({ version: 2, payload: Schema.Struct({ n: Schema.Number }) })
      const Encoded = VersionedSchema.make("Encoded", {
        version: 1,
        payload: Schema.Struct({
          n: Schema.String.check(Schema.isMinLength(3)).pipe(Schema.decodeTo(
            Schema.Number,
            SchemaTransformation.transform({ decode: Number, encode: String })
          ))
        })
      }).next({ version: 2, payload: Schema.Struct({ n: Schema.Number }) })
      for (const [schema, n] of [[Integer, 1.5], [Encoded, 12]] as const) {
        const error = failure(Schema.encodeResult(VersionedSchema.at(schema, schema.version(1)))({ n }))
        const unrepresentable = InternalVersionedSchema.findUnrepresentable(error.issue)
        assert.strictEqual(unrepresentable?.id, schema.id)
        assert.strictEqual(unrepresentable?.version, 1)
        assert.include(unrepresentable!.reason, "at [\"n\"]")
      }
      const malformed = failure(
        Schema.encodeUnknownResult(VersionedSchema.at(Integer, Integer.version(1)))({ n: "bad" })
      )
      assert.strictEqual(InternalVersionedSchema.findUnrepresentable(malformed.issue), undefined)
    })
  })

  describe("migrations", () => {
    it("validates each intermediate version in both directions before running the next migration", () => {
      let upgradedToV3 = 0
      let downgradedToV1 = 0
      const V2 = VersionedSchema.make("Steps", {
        version: 1,
        payload: Schema.Struct({ n: Schema.String })
      }).next({
        version: 2,
        payload: Schema.Struct({ n: Schema.Number.check(Schema.isGreaterThan(0)) }),
        migration: (s) =>
          s.mapField("n", {
            up: Number,
            down: (n) => {
              downgradedToV1++
              return String(n)
            }
          })
      })
      const V3 = V2.next({
        version: 3,
        payload: Schema.Struct({ n: Schema.String }),
        migration: (s) =>
          s.mapField("n", {
            up: (n) => {
              upgradedToV3++
              return String(n)
            },
            down: Number
          })
      })
      failure(Schema.decodeUnknownResult(V2)({ _version: 1, n: "-2" }))
      failure(Schema.decodeUnknownResult(V3)({ _version: 1, n: "-2" }))
      assert.strictEqual(upgradedToV3, 0)
      const down = failure(Schema.encodeResult(VersionedSchema.at(V3, V3.version(1)))({ n: "-2" }))
      assert.strictEqual(InternalVersionedSchema.findUnrepresentable(down.issue)?.version, 1)
      assert.strictEqual(downgradedToV1, 0)
      assert.deepStrictEqual(Schema.decodeUnknownSync(V3)({ _version: 1, n: "2" }), { n: "2" })
      assert.deepStrictEqual(encodeAt(V3, V3.version(1))({ n: "2" }), { _version: 1, n: "2" })
    })

    it("addField leaves an optional field absent, so partial updates don't get defaults", () => {
      const Patch = VersionedSchema.make("Patch", {
        version: 1,
        payload: Schema.Struct({ name: Schema.optionalKey(Schema.String) })
      }).next({
        version: 2,
        payload: Schema.Struct({ name: Schema.optionalKey(Schema.String), email: Schema.optionalKey(Schema.String) }),
        migration: (s) => s.addField("email")
      })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Patch)({ _version: 1 }), {})
      assert.deepStrictEqual(Schema.decodeUnknownSync(Patch)({ _version: 1, name: "Ada" }), { name: "Ada" })
    })

    it("addField computes a required field from the previous version", () => {
      const Account = VersionedSchema.make("Account", {
        version: 1,
        payload: Schema.Struct({ name: Schema.String })
      }).next({
        version: 2,
        payload: Schema.Struct({ name: Schema.String, slug: Schema.String }),
        migration: (s) => s.addField("slug", (previous) => previous.name.toLowerCase())
      })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Account)({ _version: 1, name: "Ada" }), {
        name: "Ada",
        slug: "ada"
      })
      assert.deepStrictEqual(encodeAt(Account, Account.version(1))({ name: "Ada", slug: "ada" }), {
        _version: 1,
        name: "Ada"
      })
    })

    it("removeField computes a removed required field for older readers", () => {
      const Account = VersionedSchema.make("Account", {
        version: 1,
        payload: Schema.Struct({ name: Schema.String, nickname: Schema.String })
      }).next({
        version: 2,
        payload: Schema.Struct({ name: Schema.String }),
        migration: (s) => s.removeField("nickname", (next) => next.name)
      })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Account)({ _version: 1, name: "Ada", nickname: "A" }), {
        name: "Ada"
      })
      assert.deepStrictEqual(encodeAt(Account, Account.version(1))({ name: "Ada" }), {
        _version: 1,
        name: "Ada",
        nickname: "Ada"
      })
    })

    it("mapField converts in both directions and skips absent optional fields", () => {
      const Price = VersionedSchema.make("Price", {
        version: 1,
        payload: Schema.Struct({ cents: Schema.optionalKey(Schema.Int) })
      }).next({
        version: 2,
        payload: Schema.Struct({ cents: Schema.optionalKey(Schema.String) }),
        migration: (s) => s.mapField("cents", { up: (cents) => String(cents), down: (cents) => Number(cents) })
      })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Price)({ _version: 1, cents: 5 }), { cents: "5" })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Price)({ _version: 1 }), {})
      assert.deepStrictEqual(encodeAt(Price, Price.version(1))({ cents: "5" }), { _version: 1, cents: 5 })
    })

    it("addMember and removeMember convert union members", () => {
      const Created = Schema.TaggedStruct("Created", { name: Schema.String })
      const Deleted = Schema.TaggedStruct("Deleted", { name: Schema.String })
      const Renamed = Schema.TaggedStruct("Renamed", { name: Schema.String })
      const Event = VersionedSchema.make("Event", { version: 1, payload: Schema.Union([Created, Deleted]) }).next({
        version: 2,
        payload: Schema.Union([Created, Renamed]),
        migration: (s) =>
          s.removeMember("Deleted", (deleted) => ({ _tag: "Created", name: deleted.name })).addMember("Renamed")
      })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Event)({ _version: 1, _tag: "Deleted", name: "x" }), {
        _tag: "Created",
        name: "x"
      })
      assert.isTrue(
        Result.isFailure(
          Schema.encodeResult(VersionedSchema.at(Event, Event.version(1)))({ _tag: "Renamed", name: "x" })
        )
      )
    })

    it("a version without a migration changes only how fields are encoded", () => {
      const Reading = VersionedSchema.make("Reading", {
        version: 1,
        payload: Schema.Struct({ value: Schema.NumberFromString })
      }).next({ version: 2, payload: Schema.Struct({ value: Schema.Number }) })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Reading)({ _version: 1, value: "42" }), { value: 42 })
      assert.deepStrictEqual(encodeAt(Reading, Reading.version(1))({ value: 42 }), { _version: 1, value: "42" })
    })
  })

  describe("recursive histories", () => {
    interface Tree {
      readonly label: string
      readonly children: ReadonlyArray<Tree>
    }
    // annotating the thunks is enough, so Tree keeps its versioned type
    const Tree = VersionedSchema.make("Tree", {
      version: 1,
      payload: Schema.Struct({
        name: Schema.String,
        children: Schema.Array(Schema.suspend((): Schema.Codec<Tree, unknown> => Tree))
      })
    }).next({
      version: 2,
      payload: Schema.Struct({
        label: Schema.String,
        children: Schema.Array(Schema.suspend((): Schema.Codec<Tree, unknown> => Tree))
      }),
      migration: (s) => s.renameField("name", "label")
    })
    const tree: Tree = { label: "a", children: [{ label: "b", children: [] }] }

    it("write every level at the chosen version", () => {
      assert.deepStrictEqual(encodeAt(Tree, Tree.version(1))(tree), {
        _version: 1,
        name: "a",
        children: [{ _version: 1, name: "b", children: [] }]
      })
    })

    it("that contain each other find the same nested types whichever is found first", () => {
      interface Category {
        readonly title: string
        readonly address: { readonly street: string }
        readonly items: ReadonlyArray<Item>
      }
      interface Item {
        readonly label: string
        readonly category: Category | undefined
      }
      const Category: Schema.Codec<Category, unknown> = VersionedSchema.make("Category", {
        version: 1,
        payload: Schema.Struct({
          title: Schema.String,
          address: Current.Address,
          items: Schema.Array(Schema.suspend((): Schema.Codec<Item, unknown> => Item))
        })
      })
      const Item: Schema.Codec<Item, unknown> = VersionedSchema.make("Item", {
        version: 1,
        payload: Schema.Struct({
          label: Schema.String,
          category: Schema.UndefinedOr(Schema.suspend((): Schema.Codec<Category, unknown> => Category))
        })
      })
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      assert.deepStrictEqual(ids(Category), ["Address", "Category", "Item"])
      assert.deepStrictEqual(ids(Item), ["Address", "Category", "Item"])
    })

    it("are found behind any number of other suspended schemas", () => {
      interface Node {
        readonly next?: Node | undefined
      }
      // each level of this schema is a new one, so its walk never meets a node twice
      const NodeSchema = (): Schema.Codec<Node> => Schema.Struct({ next: Schema.optional(Schema.suspend(NodeSchema)) })
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      const person = Schema.suspend(() => Person)
      assert.deepStrictEqual(ids(Schema.Struct({ tree: NodeSchema(), person })), ["Address", "Person"])
      const many = Object.fromEntries(
        Array.from({ length: 300 }, (_, i) => [`f${i}`, Schema.suspend(() => Schema.String)])
      )
      assert.deepStrictEqual(ids(Schema.Struct({ ...many, person })), ["Address", "Person"])
    })

    it("go through SchemaBinary at any version", () => {
      const binary = SchemaBinary.toCodec(Tree)
      const atV1 = SchemaBinary.toCodec(VersionedSchema.at(Tree, Tree.version(1)))
      assert.deepStrictEqual(Schema.decodeUnknownSync(binary)(Schema.encodeSync(binary)(tree)), tree)
      assert.deepStrictEqual(Schema.decodeUnknownSync(binary)(Schema.encodeSync(atV1)(tree)), tree)
    })
  })

  describe("unversioned", () => {
    const Legacy = VersionedSchema.make("Legacy", {
      version: 1,
      payload: Schema.Struct({ name: Schema.String }),
      unversioned: true
    }).next({
      version: 2,
      payload: Schema.Struct({ fullName: Schema.String }),
      migration: (s) => s.renameField("name", "fullName")
    })

    it("reads records without a version as the first version", () => {
      assert.deepStrictEqual(Schema.decodeUnknownSync(Legacy)({ name: "Ada" }), { fullName: "Ada" })
    })

    it("writes the first version without a version field", () => {
      assert.deepStrictEqual(encodeAt(Legacy, Legacy.version(1))({ fullName: "Ada" }), { name: "Ada" })
      assert.deepStrictEqual(Schema.encodeSync(Legacy)({ fullName: "Ada" }), { _version: 2, fullName: "Ada" })
    })

    it("never reads a record with a version field as the first version", () => {
      const Contact = VersionedSchema.make("Contact", {
        version: 1,
        payload: Schema.Struct({ name: Schema.String }),
        unversioned: true
      }).next({
        version: 2,
        payload: Schema.Struct({ name: Schema.String, email: Schema.optionalKey(Schema.String) }),
        migration: (s) => s.addField("email")
      })
      // the first version's fields would accept it, dropping `email`
      assert.deepStrictEqual(Schema.decodeUnknownSync(Contact)({ _version: 2, name: "Ada", email: "a@b.c" }), {
        name: "Ada",
        email: "a@b.c"
      })
      const unknown = failure(Schema.decodeUnknownResult(Contact)({ _version: 3, name: "Ada" }))
      assert.strictEqual(unknown.message, "Expected Contact with _version 2, or without _version\n  at [\"_version\"]")
    })
  })

  describe("definitions", () => {
    it("rejects payloads that aren't records with fixed keys, or that use _version", () => {
      const make = VersionedSchema.make as unknown as (
        id: string,
        options: { version: number; payload: Schema.Top }
      ) => unknown
      assert.throws(() => make("A", { version: 1, payload: Schema.String }))
      assert.throws(() => make("A", { version: 1, payload: Schema.Record(Schema.String, Schema.Number) }))
      assert.throws(() => make("A", { version: 1, payload: Schema.Struct({ _version: Schema.Number }) }))
    })

    it("rejects invalid ids and versions that don't increase", () => {
      assert.throws(() => VersionedSchema.make("A=B", { version: 1, payload: Schema.Struct({}) }))
      assert.throws(() => VersionedSchema.make("__proto__", { version: 1, payload: Schema.Struct({}) }))
      assert.throws(() => VersionedSchema.make("人物", { version: 1, payload: Schema.Struct({}) }))
      assert.throws(() => VersionedSchema.make("a\u0000b", { version: 1, payload: Schema.Struct({}) }))
      assert.throws(() => VersionedSchema.make("A", { version: 0, payload: Schema.Struct({}) }))
      const A = VersionedSchema.make("A", { version: 2, payload: Schema.Struct({}) })
      assert.throws(() => A.next({ version: 1 as 3, payload: Schema.Struct({}) }))
    })

    it("documents every version's record in JSON Schema", () => {
      const document = Schema.toJsonSchemaDocument(Old.Person)
      assert.deepStrictEqual(document.schema, { $ref: "#/$defs/Person" })
      assert.deepStrictEqual(document.definitions.Person, {
        anyOf: [{
          type: "object",
          properties: {
            _version: { type: "number", enum: [1] },
            name: { type: "string" },
            status: { type: "string", enum: ["active", "suspended"] },
            address: { $ref: "#/$defs/Address" }
          },
          required: ["_version", "name", "status", "address"],
          additionalProperties: true
        }]
      })
    })

    it("a schema is versioned only if it encodes through a history's records", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      const both = ["Address", "Person"]
      assert.deepStrictEqual(ids(Person), both)
      assert.deepStrictEqual(ids(Person.annotate({ description: "a person" })), both)
      assert.deepStrictEqual(ids(VersionedSchema.at(Person, Person.version(1))), both)
      assert.deepStrictEqual(ids(Schema.fromJsonString(Person)), both)
      assert.deepStrictEqual(ids(Schema.toCodecJson(Person)), both)
      // these flip it twice, which rebuilds its transformation
      assert.deepStrictEqual(ids(Person.pipe(Schema.annotateEncoded({ description: "a record" }))), both)
      assert.deepStrictEqual(ids(Schema.flip(Schema.flip(Person))), both)
      assert.deepStrictEqual(ids(Schema.flip(Person)), [])
      assert.deepStrictEqual(ids(Schema.toType(Person)), [])
      assert.deepStrictEqual(ids(Schema.toEncoded(Person)), [])
      // a custom wire format for the type side, which carries the history's annotation
      const fromAddress = Schema.Struct({ address: Current.Address }).pipe(Schema.decodeTo(
        Schema.toType(Person),
        SchemaTransformation.transform({
          decode: ({ address }): typeof Person.Type => ({ fullName: "Ada", status: "active", address }),
          encode: ({ address }) => ({ address })
        })
      ))
      assert.deepStrictEqual(ids(fromAddress), ["Address"])
    })

    it("follows a recursive schema built by a function only a few levels", () => {
      interface Node {
        readonly next?: Node | undefined
      }
      let built = 0
      const NodeSchema = (): Schema.Codec<Node> => {
        built++
        return Schema.Struct({ next: Schema.optional(Schema.suspend(NodeSchema)) })
      }
      InternalVersionedSchema.collect([NodeSchema()])
      assert.isAtMost(built, 4)
      // with two suspended fields per level
      interface Tree {
        readonly left?: Tree | undefined
        readonly right?: Tree | undefined
      }
      let trees = 0
      const TreeSchema = (): Schema.Codec<Tree> => {
        trees++
        return Schema.Struct({
          left: Schema.optional(Schema.suspend(TreeSchema)),
          right: Schema.optional(Schema.suspend(TreeSchema))
        })
      }
      InternalVersionedSchema.collect([TreeSchema()])
      assert.isAtMost(trees, 16)
      // with many, the walk's limit stops it
      let wide = 0
      const WideSchema = (): Schema.Top => {
        wide++
        return Schema.Struct(
          Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`f${i}`, Schema.suspend(WideSchema)]))
        )
      }
      InternalVersionedSchema.collect([WideSchema()])
      // the root, and the schemas up to the limit, comparisons included
      assert.isAtMost(wide, 1 + 2048)
      // with levels that each differ, behind wrappers of schemas declared once
      let wrapped = 0
      const WrappedSchema = (depth: number): Schema.Top => {
        wrapped++
        const next = () =>
          (Schema.Array(Schema.String) as Schema.Top).pipe(Schema.encodeTo(WrappedSchema(depth + 1) as any))
        return Schema.Struct({ a: Schema.suspend(next), b: Schema.suspend(next) }).annotate({
          identifier: `Level${depth}`
        })
      }
      InternalVersionedSchema.collect([WrappedSchema(0)])
      assert.isAtMost(wrapped, 1 + 2048)
    })

    it("finds versioned types behind classes and other declarations that refer to each other", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      class Customer extends Schema.Class<Customer>("Customer")({ name: Schema.String, address: Current.Address }) {}
      class Order extends Schema.Class<Order>("Order")({
        id: Schema.String,
        customer: Schema.suspend((): Schema.Codec<Customer, unknown> => Customer)
      }) {}
      assert.deepStrictEqual(ids(Order), ["Address"])
      class Line extends Schema.Class<Line>("Line")({ shipTo: Current.Address }) {}
      assert.deepStrictEqual(ids(Schema.Array(Schema.Struct({ lines: Schema.suspend(() => Schema.Array(Line)) }))), [
        "Address"
      ])
      class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {
        closest: Schema.suspend((): Schema.Codec<Customer, unknown> => Customer)
      }) {}
      assert.deepStrictEqual(ids(NotFound), ["Address"])
      assert.deepStrictEqual(
        ids(Schema.Option(Schema.Struct({ c: Schema.suspend((): Schema.Codec<Customer, unknown> => Customer) }))),
        ["Address"]
      )
      // the same suspended schema, reached first through a class and then a struct
      const Shared = Schema.Struct({ c: Schema.suspend((): Schema.Codec<Customer, unknown> => Customer) })
      class Holder extends Schema.Class<Holder>("Holder")({ s: Shared }) {}
      const response = (roots: ReadonlyArray<Schema.Top>) => [
        ...(InternalVersionedSchema.contract([], roots)?.histories.keys() ?? [])
      ]
      assert.deepStrictEqual(response([Holder, Schema.Struct({ s: Shared })]), ["Address"])
      assert.deepStrictEqual(response([Schema.Struct({ s: Shared }), Holder]), ["Address"])
    })

    it("tells apart schemas that differ only behind their suspended schemas", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      const PurchaseOrder = Schema.Struct({ id: Schema.String, ship: Current.Address })
      const Supplier = Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        orders: Schema.Array(Schema.suspend(() => PurchaseOrder))
      })
      const SalesOrder = Schema.Struct({ id: Schema.String, supplier: Schema.suspend(() => Supplier) })
      const Customer = Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        orders: Schema.Array(Schema.suspend(() => SalesOrder))
      })
      assert.deepStrictEqual(ids(Customer), ["Address"])
      // an identifier given after a check
      const Named = (identifier: string, inner: Schema.Top) =>
        Schema.Struct({ next: Schema.suspend(() => inner) }).check(Schema.makeFilter(() => true)).annotate({
          identifier
        })
      const holder = Schema.Struct({ a: Current.Address })
      assert.deepStrictEqual(ids(Named("Outer", Named("Middle", Named("Inner", holder)))), ["Address"])
    })

    it("finds versioned types below a few levels with the same fields", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      // a hierarchy built by one helper, whose levels look alike
      const Level = (child: () => Schema.Top) =>
        Schema.Struct({ id: Schema.String, name: Schema.String, children: Schema.Array(Schema.suspend(child)) })
      const Member = Schema.Struct({ id: Schema.String, home: Current.Address })
      const Team = Level(() => Member)
      const Division = Level(() => Team)
      const Company = Level(() => Division)
      assert.deepStrictEqual(ids(Company), ["Address"])
    })

    it("finds versioned types behind long chains and many suspended schemas", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      let chain: Schema.Top = Schema.Struct({ person: Person })
      for (let i = 0; i < 20; i++) {
        const inner = chain
        chain = Schema.Struct({ [`level${i}`]: Schema.suspend(() => inner) })
      }
      assert.deepStrictEqual(ids(chain), ["Address", "Person"])
      const wide = Object.fromEntries(
        Array.from(
          { length: 600 },
          (_, i) => [`f${i}`, Schema.suspend(() => Schema.Struct({ [`g${i}`]: Schema.String }))]
        )
      )
      assert.deepStrictEqual(ids(Schema.Struct({ ...wide, person: Schema.suspend(() => Person) })), [
        "Address",
        "Person"
      ])
    })

    it("finds versioned types deep in large models whose entities share their first fields", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      // comparing each entity to the ones above it reaches the same user every time
      const User = Schema.Struct({ id: Schema.String, name: Schema.String })
      const entities: Array<Schema.Top> = []
      for (let i = 0; i < 60; i++) {
        entities.push(Schema.Struct({
          id: Schema.String,
          createdBy: Schema.suspend(() => User),
          [`field${i}`]: Schema.String,
          next: Schema.suspend(() => entities[i + 1])
        }))
      }
      entities.push(Schema.Struct({ person: Person }))
      assert.deepStrictEqual(ids(entities[0]), ["Address", "Person"])
    })

    it("counts an entity once however many relations wrap it", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      // `suspend(() => Schema.Array(Entity))` builds a new array at every relation
      const relation = (entity: () => Schema.Top) => Schema.optionalKey(Schema.suspend(() => Schema.Array(entity())))
      const Holder = Schema.Struct({ person: Person })
      const entities: Array<Schema.Top> = []
      for (let i = 0; i < 450; i++) {
        entities.push(Schema.Struct({
          id: Schema.String,
          [`field${i}`]: Schema.String,
          ...Object.fromEntries(
            Array.from({ length: 5 }, (_, r) => [
              `relation${r}`,
              relation(() => i === 449 && r === 4 ? Holder : entities[(i + r + 1) % 450])
            ])
          )
        }))
      }
      const Root = Schema.Struct(
        Object.fromEntries(entities.map((entity, i) => [`entity${i}`, relation(() => entity)]))
      )
      assert.deepStrictEqual(ids(Root), ["Address", "Person"])
    })

    it("counts a relation once when its thunk builds a union of new members", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      const relation = (entity: () => Schema.Top) =>
        Schema.optionalKey(Schema.suspend(() =>
          Schema.Union([
            Schema.Struct({ kind: Schema.Literal("a"), a: entity() }),
            Schema.Struct({ kind: Schema.Literal("b"), b: entity() })
          ])
        ))
      const Holder = Schema.Struct({ person: Person })
      const entities: Array<Schema.Top> = []
      for (let i = 0; i < 300; i++) {
        entities.push(Schema.Struct({
          id: Schema.String,
          [`field${i}`]: Schema.String,
          ...Object.fromEntries(
            Array.from({ length: 5 }, (_, r) => [
              `relation${r}`,
              relation(() => i === 299 && r === 4 ? Holder : entities[(i + r + 1) % 300])
            ])
          )
        }))
      }
      const Root = Schema.Struct(
        Object.fromEntries(entities.map((entity, i) => [`entity${i}`, relation(() => entity)]))
      )
      assert.deepStrictEqual(ids(Root), ["Address", "Person"])
    })

    it("finds versioned types that suspended and versioned schemas decode from", () => {
      const ids = (schema: Schema.Top) => [...InternalVersionedSchema.collect([schema]).keys()].sort()
      const Address = Schema.Struct({ street: Schema.String, city: Schema.optionalKey(Schema.String) })
      // a recursive domain type written as a versioned record
      const fromRecord = Current.Address.pipe(
        Schema.decodeTo(Schema.suspend(() => Address), SchemaTransformation.passthrough())
      )
      assert.deepStrictEqual(ids(fromRecord), ["Address"])
      const decoded = Schema.suspend((): Schema.Codec<typeof Address.Type, unknown> => Current.Address).pipe(
        Schema.decode(SchemaTransformation.passthrough())
      )
      assert.deepStrictEqual(ids(decoded), ["Address"])
      const Street = VersionedSchema.make("Street", { version: 1, payload: Schema.Struct({ street: Schema.String }) })
      const fromVersioned = Street.pipe(
        Schema.decodeTo(Current.Address, SchemaTransformation.passthrough() as any)
      )
      assert.deepStrictEqual(ids(fromVersioned), ["Address", "Street"])
    })

    it("histories that extend each other share an id; unrelated ones can't", () => {
      assert.strictEqual(
        InternalVersionedSchema.collect([Old.Person, Current.Person]).get("Person")?.versions.length,
        3
      )
      const Other = VersionedSchema.make("Person", { version: 1, payload: Schema.Struct({ other: Schema.String }) })
      assert.throws(() => InternalVersionedSchema.collect([Current.Person, Other]))
    })
  })
})
