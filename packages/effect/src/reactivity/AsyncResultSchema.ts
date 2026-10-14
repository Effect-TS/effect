/**
 * Schemas for encoding and decoding `AsyncResult` values.
 *
 * `Schema` builds a schema from the success and error schemas of an
 * `AsyncResult`. Initial, success, and failure states round-trip through that
 * schema, including a previous success carried on a failure.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as Option from "../Option.ts"
import * as Schema_ from "../Schema.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaParser from "../SchemaParser.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import { type AsyncResult, failure, initial, isAsyncResult, success } from "./AsyncResult.ts"

/**
 * Schema interface for `AsyncResult` values, retaining the schemas used for success values and failure errors.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export interface Schema<
  Success extends Schema_.Constraint,
  Error extends Schema_.Constraint
> extends
  Schema_.declareConstructor<
    AsyncResult<Success["Type"], Error["Type"]>,
    AsyncResult<Success["Encoded"], Error["Encoded"]>,
    readonly [Success, Schema_.Cause<Error, Schema_.Defect>]
  >
{
  readonly success: Success
  readonly error: Error
}

/**
 * Creates a schema for `AsyncResult` values using optional schemas for success values and failure errors.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const Schema = <
  A extends Schema_.Constraint = Schema_.Never,
  E extends Schema_.Constraint = Schema_.Never
>(
  options: {
    readonly success?: A | undefined
    readonly error?: E | undefined
  }
): Schema<A, E> => {
  const success_: A = options.success ?? Schema_.Never as any
  const error: E = options.error ?? Schema_.Never as any
  const schema = Schema_.declareConstructor<
    AsyncResult<A["Type"], E["Type"]>,
    AsyncResult<A["Encoded"], E["Encoded"]>
  >()(
    [success_, Schema_.Cause(error, Schema_.Defect())],
    ([value, cause]) => (input, ast, options) => {
      if (!isAsyncResult(input)) {
        return Effect.fail(new SchemaIssue.InvalidType(ast, input, options))
      }
      switch (input._tag) {
        case "Initial":
          return Effect.succeed(input)
        case "Success":
          return Effect.mapBothEager(
            SchemaParser.decodeUnknownEffect(value)(input.value, options),
            {
              onSuccess: (value) => success(value, input),
              onFailure: (issue) => SchemaIssue.makeCompositeAtKey(ast, "value", issue, input, options)
            }
          )
        case "Failure": {
          const prevSuccessEffect = input.previousSuccess.pipe(
            Option.map((ps) =>
              Effect.mapBothEager(
                SchemaParser.decodeUnknownEffect(value)(ps.value, options),
                {
                  onSuccess: (value) => Option.some(success<A["Type"], E["Type"]>(value, ps)),
                  onFailure: (issue) =>
                    new SchemaIssue.Composite(
                      ast,
                      [
                        new SchemaIssue.Pointer(["previousSuccess", "value"], issue)
                      ],
                      input,
                      options
                    )
                }
              )
            ),
            Option.getOrElse(() => Effect.succeedNone)
          )
          const causeEffect = Effect.mapErrorEager(
            SchemaParser.decodeUnknownEffect(cause)(input.cause, options),
            (issue) => SchemaIssue.makeCompositeAtKey(ast, "cause", issue, input, options)
          )
          return Effect.flatMapEager(
            prevSuccessEffect,
            (previousSuccess) =>
              Effect.mapEager(causeEffect, (cause) =>
                failure(cause, {
                  previousSuccess,
                  waiting: input.waiting
                }))
          )
        }
      }
    },
    {
      expected: "AsyncResult",
      toCodec([value, cause]) {
        const Success = Schema_.TaggedStruct("Success", { value, waiting: Schema_.Boolean, timestamp: Schema_.Int })
        return Schema_.link<AsyncResult<A["Encoded"], E["Encoded"]>>()(
          Schema_.Union([
            Schema_.TaggedStruct("Initial", { waiting: Schema_.Boolean }),
            Success,
            Schema_.TaggedStruct("Failure", {
              cause,
              previousSuccess: Schema_.Option(Success),
              waiting: Schema_.Boolean
            })
          ]),
          SchemaTransformation.transform({
            decode: (encoded): AsyncResult<A["Encoded"], E["Encoded"]> => {
              switch (encoded._tag) {
                case "Initial":
                  return initial(encoded.waiting)
                case "Success":
                  return success(encoded.value, {
                    waiting: encoded.waiting,
                    timestamp: encoded.timestamp
                  })
                case "Failure": {
                  return failure(encoded.cause, {
                    previousSuccess: Option.map(encoded.previousSuccess, (ps) => success(ps.value, ps)),
                    waiting: encoded.waiting
                  })
                }
              }
            },
            encode(result) {
              switch (result._tag) {
                case "Initial":
                  return { _tag: "Initial" as const, waiting: result.waiting }
                case "Success":
                  return {
                    _tag: "Success" as const,
                    value: result.value,
                    waiting: result.waiting,
                    timestamp: result.timestamp
                  }
                case "Failure":
                  return {
                    _tag: "Failure" as const,
                    cause: result.cause,
                    previousSuccess: result.previousSuccess,
                    waiting: result.waiting
                  }
              }
            }
          })
        )
      },
      toEquivalence: Equal.asEquivalence,
      toFormatter: ([value, cause]) => (t) => {
        switch (t._tag) {
          case "Success":
            return `AsyncResult.Success(${value(t.value)}, ${t.waiting}, ${t.timestamp})`
          case "Failure":
            return `AsyncResult.Failure(${cause(t.cause)}, ${t.waiting})`
          case "Initial":
            return `AsyncResult.Initial(${t.waiting}, ${t.waiting})`
        }
      }
    }
  )
  return Object.assign(schema, {
    success: success_,
    error
  })
}
