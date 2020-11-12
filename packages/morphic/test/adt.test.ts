import * as E from "@effect-ts/core/Classic/Either"
import * as O from "@effect-ts/core/Classic/Option"
import * as Sync from "@effect-ts/core/Sync"

import type { AType, EType } from "../src"
import { DecoderURI, make, makeADT, opaque } from "../src"
import { decode, report } from "../src/Decoder"
import { guard } from "../src/Guard"
import { hash } from "../src/Hash"

const Foo_ = make((F) =>
  F.interface(
    {
      _tag: F.stringLiteral("Foo"),
      foo: F.string()
    },
    {
      name: "Foo"
    }
  )
)

interface Foo extends AType<typeof Foo_> {}
interface FooRaw extends EType<typeof Foo_> {}
const Foo = opaque<FooRaw, Foo>()(Foo_)

const Bar_ = make((F) =>
  F.interface(
    {
      _tag: F.stringLiteral("Bar"),
      bar: F.string()
    },
    {
      name: "Bar"
    }
  )
)

interface Bar extends AType<typeof Bar_> {}
interface BarRaw extends EType<typeof Bar_> {}
const Bar = opaque<BarRaw, Bar>()(Bar_)

const FooBar = makeADT("_tag")({ Foo, Bar })

const isString = O.fromPredicate(guard(make((F) => F.string())).is)
const isNumber = O.fromPredicate(guard(make((F) => F.number())).is)

const CustomUnion = make((F) =>
  F.union(F.string(), F.number())([isString, isNumber], {
    conf: {
      [DecoderURI]: (_, __, ___) => _
    }
  })
)

describe("Adt", () => {
  it("non tagged unions", () => {
    expect(Sync.runEither(report(decode(CustomUnion)("ok")))).toEqual(E.right("ok"))
    expect(Sync.runEither(report(decode(CustomUnion)(1)))).toEqual(E.right(1))
    expect(Sync.runEither(report(decode(CustomUnion)(null)))).toEqual(
      E.left(["Expecting one of:\n    String\n    Number\nbut instead got: null"])
    )
  })
  it("decoder", () => {
    expect(Sync.runEither(decode(FooBar)({ _tag: "Foo", foo: "foo" }))).toEqual(
      E.right<Foo>({ _tag: "Foo", foo: "foo" })
    )
    expect(Sync.runEither(decode(FooBar)({ _tag: "Bar", bar: "bar" }))).toEqual(
      E.right<Bar>({ _tag: "Bar", bar: "bar" })
    )
    expect(Sync.runEither(report(decode(FooBar)({ _tag: "Baz", baz: "baz" })))).toEqual(
      E.left([
        'Expecting TaggedUnion but instead got: {"_tag":"Baz","baz":"baz"} (Baz is not known in (Foo, Bar))'
      ])
    )
    expect(Sync.runEither(report(decode(FooBar)({ _tag: "Bar", baz: "baz" })))).toEqual(
      E.left([
        "Expecting String at bar but instead got: undefined (undefined is not a string)"
      ])
    )
  })
  it("Hashes adt", () => {
    expect(hash(FooBar).hash).toEqual(
      'Tagged(_tag)({"_tag":"Bar","bar":"string"} | {"_tag":"Foo","foo":"string"})'
    )
  })
})
