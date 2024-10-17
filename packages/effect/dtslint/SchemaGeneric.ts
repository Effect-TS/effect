import { Either, Schema } from "effect"

export const f1 = <A extends object, I extends object, R>(
  resultSchema: Schema.Schema<A, I, R>
) => {
  const left = Schema.Struct({
    ok: Schema.Literal(false),
    error: Schema.String
  })
  const right = <A, I, R>(
    resultSchema: Schema.Schema<A, I, R>
  ) => Schema.extend(Schema.Struct({ ok: Schema.Literal(true) }), resultSchema)
  const union = Schema.Union(left, right(resultSchema))
  const out = Schema.transform(
    union,
    Schema.EitherFromSelf({ left: Schema.String, right: Schema.typeSchema(resultSchema) }),
    {
      decode: (u) => u.ok ? Either.right(u) : Either.left(u.error),
      encode: (a) => ({ ok: true as const, ...a })
    }
  )
  return out
}

type Model = { id: string } & Record<string, unknown>

export const f2 = <T extends Model>(schema: Schema.Schema<T>) => {
  type Patch = Pick<T, "id"> & Partial<Omit<T, "id">>

  const patch: Schema.Schema<Patch> = schema.pipe(
    Schema.pick("id"),
    Schema.extend(schema.pipe(Schema.omit("id"), Schema.partial))
  )

  return patch
}
