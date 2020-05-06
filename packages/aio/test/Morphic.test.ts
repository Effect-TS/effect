import * as J from "@matechs/test-jest"

import { MO, T, Ex, pipe, combineProviders } from "../src"

interface Config {
  [MO.FastCheckURI]: {
    firstName: string
    lastName: string
  }
}

const { summon, tagged } = MO.summonFor<Config>({})

const Person = summon((F) =>
  F.interface(
    {
      firstName: F.string({
        [MO.FastCheckURI]: (x, _) => x.map((n) => `${_.firstName}${n}`)
      }),
      lastName: F.string({
        [MO.FastCheckURI]: (x, _) => x.map((n) => `${_.lastName}${n}`)
      })
    },
    "Person"
  )
)

const PersonArb = MO.arb(Person)({
  [MO.FastCheckURI]: {
    firstName: "f_",
    lastName: "l_"
  }
})

const A_ = summon((F) =>
  F.interface(
    {
      _tag: F.stringLiteral("A"),
      foo: F.string()
    },
    "A"
  )
)

interface A extends MO.AType<typeof A_> {}
// eslint-disable-next-line @typescript-eslint/class-name-casing
interface A_ extends MO.EType<typeof A_> {}
const A = MO.AsOpaque<A_, A>()(A_)

const B_ = summon((F) =>
  F.interface(
    {
      _tag: F.stringLiteral("B"),
      bar: F.string()
    },
    "B"
  )
)

interface B extends MO.AType<typeof B_> {}
// eslint-disable-next-line @typescript-eslint/class-name-casing
interface B_ extends MO.EType<typeof B_> {}
const B = MO.AsOpaque<B_, B>()(B_)

const C_ = summon((F) =>
  F.interface(
    {
      _tag: F.stringLiteral("C"),
      baz: F.string()
    },
    "C"
  )
)

interface C extends MO.AType<typeof C_> {}
// eslint-disable-next-line @typescript-eslint/class-name-casing
interface C_ extends MO.EType<typeof C_> {}
const C = MO.AsOpaque<C_, C>()(C_)

const Tagged = tagged("_tag")({ A, B, C })
const TaggedMatch = MO.match(Tagged)

const MorphicSuite = J.suite("Morphic")(
  J.testM(
    "generate persons",
    J.property(1000)({
      pers: J.arb(PersonArb)
    })(({ pers }) => {
      expect(Object.keys(pers)).toStrictEqual(["firstName", "lastName"])
      expect(pers.firstName.substr(0, 2)).toStrictEqual("f_")
      expect(pers.lastName.substr(0, 2)).toStrictEqual("l_")
    })
  ),
  J.testM(
    "match",
    T.sync(() => {
      const matcher = TaggedMatch(
        {
          A: (a) => a._tag
        },
        (bc) => bc._tag
      )

      J.assert.deepStrictEqual(matcher(Tagged.of.A({ foo: "ok" })), "A")
      J.assert.deepStrictEqual(matcher(Tagged.of.B({ bar: "ok" })), "B")
      J.assert.deepStrictEqual(matcher(Tagged.of.C({ baz: "ok" })), "C")
    })
  ),
  J.testM(
    "match - 2",
    T.sync(() => {
      const matcher = TaggedMatch({
        A: (a) => T.sync(() => a._tag),
        B: (b) => T.sync(() => b._tag),
        C: (c) => T.sync(() => c._tag)
      })

      J.assert.deepStrictEqual(
        T.runSync(matcher(Tagged.of.A({ foo: "ok" }))),
        Ex.done("A")
      )
      J.assert.deepStrictEqual(
        T.runSync(matcher(Tagged.of.B({ bar: "ok" }))),
        Ex.done("B")
      )
      J.assert.deepStrictEqual(
        T.runSync(matcher(Tagged.of.C({ baz: "ok" }))),
        Ex.done("C")
      )
    })
  ),
  J.testM(
    "match - 3",
    T.sync(() => {
      const matcher = TaggedMatch(
        {
          A: (a) => T.sync(() => a._tag),
          B: (b) => T.sync(() => b._tag)
        },
        (c) => T.access((_: { t: string }) => c._tag)
      )

      J.assert.deepStrictEqual(
        T.runSync(
          pipe(
            matcher(Tagged.of.A({ foo: "ok" })),
            T.provide({
              t: ""
            })
          )
        ),
        Ex.done("A")
      )
      J.assert.deepStrictEqual(
        T.runSync(
          pipe(
            matcher(Tagged.of.B({ bar: "ok" })),
            T.provide({
              t: ""
            })
          )
        ),
        Ex.done("B")
      )
      J.assert.deepStrictEqual(
        T.runSync(
          pipe(
            matcher(Tagged.of.C({ baz: "ok" })),
            T.provide({
              t: ""
            })
          )
        ),
        Ex.done("C")
      )
    })
  ),
  J.testM(
    "match - 4",
    pipe(
      TaggedMatch(
        {
          A: (a) => T.sync(() => a._tag),
          B: (b) => T.shiftAfter(T.sync(() => b._tag))
        },
        (c) => T.access((_: { t: string }) => c._tag)
      )(Tagged.of.A({ foo: "ok" })),
      T.map((res) => J.assert.deepStrictEqual(res, "A"))
    )
  )
)

J.run(MorphicSuite)(
  combineProviders()
    .with(J.provideGenerator)
    .with(T.provide({ t: "ok" }))
    .done()
)
