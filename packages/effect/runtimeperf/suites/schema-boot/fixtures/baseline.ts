import * as Schema from "effect/Schema"

export const createWorkload = () => {
  let Person: ReturnType<typeof define>
  let decode: (input: unknown) => unknown
  const define = () =>
    Schema.Struct({
      name: Schema.String,
      age: Schema.Number
    })
  const input = { name: "Ada", age: 36 }
  return {
    define: () => {
      Person = define()
    },
    phases: {
      decode: () => (decode = Schema.decodeUnknownSync(Person))(input),
      encode: () => Schema.encodeSync(Person)(input)
    },
    warm: () => decode(input),
    retained: () => Person
  }
}
