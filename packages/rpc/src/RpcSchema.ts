/**
 * @since 1.0.0
 */
import type * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import { hasProperty } from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Stream_ from "effect/Stream"

/**
 * @since 1.0.0
 * @category Stream
 */
export const StreamSchemaId: unique symbol = Symbol.for("@effect/rpc/RpcSchema/Stream")

/**
 * @since 1.0.0
 * @category Stream
 */
export const isStreamSchema = (schema: Schema.Schema.All): schema is Stream<any, any> =>
  schema.ast.annotations[AST.SchemaIdAnnotationId] === StreamSchemaId

/**
 * @since 1.0.0
 * @category Stream
 */
export const isStreamSerializable = (schema: Schema.WithResult.Any): boolean =>
  isStreamSchema(Schema.successSchema(schema))

/**
 * @since 1.0.0
 * @category Stream
 */
export const getStreamSchemas = (
  ast: AST.AST
): Option.Option<{
  readonly success: Schema.Schema.Any
  readonly failure: Schema.Schema.All
}> => ast.annotations[StreamSchemaId] ? Option.some(ast.annotations[StreamSchemaId] as any) : Option.none()

/**
 * @since 1.0.0
 * @category Stream
 */
export interface Stream<A extends Schema.Schema.Any, E extends Schema.Schema.All> extends
  Schema.Schema<
    Stream_.Stream<A["Type"], E["Type"]>,
    Stream_.Stream<A["Encoded"], E["Encoded"]>,
    A["Context"] | E["Context"]
  >
{
  readonly success: A
  readonly failure: E
}

/**
 * @since 1.0.0
 * @category Stream
 */
export const Stream = <A extends Schema.Schema.Any, E extends Schema.Schema.All>(
  { failure, success }: {
    readonly failure: E
    readonly success: A
  }
): Stream<A, E> =>
  Object.assign(
    Schema.declare(
      [success, failure],
      {
        decode: (success, failure) =>
          parseStream(
            ParseResult.decodeUnknown(Schema.ChunkFromSelf(success)),
            ParseResult.decodeUnknown(failure)
          ),
        encode: (success, failure) =>
          parseStream(
            ParseResult.encodeUnknown(Schema.ChunkFromSelf(success)),
            ParseResult.encodeUnknown(failure)
          )
      },
      {
        schemaId: StreamSchemaId,
        [StreamSchemaId]: { success, failure }
      }
    ),
    {
      success,
      failure
    }
  )

const isStream = (u: unknown): u is Stream_.Stream<unknown, unknown> => hasProperty(u, Stream_.StreamTypeId)

const parseStream = <A, E, RA, RE>(
  decodeSuccess: (
    u: Chunk.Chunk<unknown>,
    overrideOptions?: AST.ParseOptions
  ) => Effect.Effect<Chunk.Chunk<A>, ParseResult.ParseIssue, RA>,
  decodeFailure: (u: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<E, ParseResult.ParseIssue, RE>
) =>
(u: unknown, options: AST.ParseOptions, ast: AST.AST) =>
  Effect.flatMap(
    Effect.context<RA | RE>(),
    (context) => {
      if (!isStream(u)) return Effect.fail(new ParseResult.Type(ast, u))
      return Effect.succeed(u.pipe(
        Stream_.mapChunksEffect((value) => decodeSuccess(value, options)),
        Stream_.catchAll((error) => {
          if (ParseResult.isParseError(error)) return Stream_.die(error)
          return Effect.matchEffect(decodeFailure(error, options), {
            onFailure: Effect.die,
            onSuccess: Effect.fail
          })
        }),
        Stream_.provideContext(context)
      ))
    }
  )
