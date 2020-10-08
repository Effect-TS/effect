import * as E from "@effect-ts/core/Classic/Either"
import * as Sync from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AType, EType } from "../src"
import { make, makeADT, opaque } from "../src"
import { decoder, report } from "../src/Decoder"

const Foo_ = make((F) =>
  F.interface({
    _tag: F.stringLiteral("Foo"),
    foo: F.string()
  })
)

interface Foo extends AType<typeof Foo_> {}
interface FooRaw extends EType<typeof Foo_> {}
const Foo = opaque<FooRaw, Foo>()(Foo_)

const Bar_ = make((F) =>
  F.interface({
    _tag: F.stringLiteral("Bar"),
    bar: F.string()
  })
)

interface Bar extends AType<typeof Bar_> {}
interface BarRaw extends EType<typeof Bar_> {}
const Bar = opaque<BarRaw, Bar>()(Bar_)

const FooBar = makeADT("_tag")({ Foo, Bar })

describe("Adt", () => {
  it("decoder", () => {
    expect(Sync.runEither(decoder(FooBar).decode({ _tag: "Foo", foo: "foo" }))).toEqual(
      E.right<Foo>({ _tag: "Foo", foo: "foo" })
    )
    expect(Sync.runEither(decoder(FooBar).decode({ _tag: "Bar", bar: "bar" }))).toEqual(
      E.right<Bar>({ _tag: "Bar", bar: "bar" })
    )
    expect(
      Sync.runEither(
        pipe(decoder(FooBar).decode({ _tag: "Baz", baz: "baz" }), Sync.mapError(report))
      )
    ).toEqual(E.left("Baz is not known in (Foo, Bar)"))
  })
})
