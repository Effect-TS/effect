/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import * as Context from "effect/Context"
import * as Option from "effect/Option"
import type * as Api from "./Api.js"
import * as ApiEndpoint from "./ApiEndpoint.js"
import type * as ApiGroup from "./ApiGroup.js"
import * as ApiSchema from "./ApiSchema.js"
import type { HttpMethod } from "./HttpMethod.js"

const extractErrors = (
  ast: AST.AST,
  encoded: boolean,
  inherited: ReadonlyMap<number, AST.AST>
): ReadonlyMap<number, AST.AST> => {
  const topStatus = ApiSchema.getStatusErrorAST(ast)
  ast = encoded ? AST.encodedAST(ast) : ast
  const errors = new Map(inherited)
  function process(ast: AST.AST) {
    if (ast._tag === "NeverKeyword") {
      return
    }
    const status = ApiSchema.getStatus(ast, topStatus)
    if (errors.has(status)) {
      const current = errors.get(status)!
      errors.set(
        status,
        AST.Union.make(
          current._tag === "Union" ? [...current.types, ast] : [current, ast]
        )
      )
    } else {
      errors.set(status, ast)
    }
  }
  if (ast._tag === "Union") {
    for (const type of ast.types) {
      process(type)
    }
  } else {
    process(ast)
  }
  return errors
}

/**
 * @since 1.0.0
 * @category reflection
 */
export const reflect = <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
  self: Api.Api<Groups, Error, ErrorR>,
  options: {
    readonly mode: "encoded" | "full"
    readonly onGroup: (options: {
      readonly apiAnnotations: Context.Context<never>
      readonly group: ApiGroup.ApiGroup<string, any>
      readonly annotations: Context.Context<never>
    }) => void
    readonly onEndpoint: (options: {
      readonly apiAnnotations: Context.Context<never>
      readonly group: ApiGroup.ApiGroup<string, any>
      readonly groupAnnotations: Context.Context<never>
      readonly endpoint: ApiEndpoint.ApiEndpoint<string, HttpMethod>
      readonly annotations: Context.Context<never>
      readonly success: readonly [ast: Option.Option<AST.AST>, status: number]
      readonly errors: ReadonlyMap<number, AST.AST>
    }) => void
  }
) => {
  const apiErrors = extractErrors(self.errorSchema.ast, options.mode === "encoded", new Map())

  const groups = self.groups as Iterable<ApiGroup.ApiGroup<string, any>>
  for (const group of groups) {
    const groupErrors = extractErrors(group.errorSchema.ast, options.mode === "encoded", apiErrors)
    const groupAnnotations = Context.merge(self.annotations, group.annotations)
    options.onGroup({
      apiAnnotations: self.annotations,
      group,
      annotations: groupAnnotations
    })
    const endpoints = group.endpoints as Iterable<ApiEndpoint.ApiEndpoint<string, HttpMethod>>

    for (const endpoint of endpoints) {
      const errors = extractErrors(endpoint.errorSchema.ast, options.mode === "encoded", groupErrors)
      const annotations = Context.merge(groupAnnotations, endpoint.annotations)
      const success = [
        ApiEndpoint.schemaSuccess(endpoint).pipe(
          Option.map((schema) => options.mode === "full" ? schema.ast : AST.encodedAST(schema.ast))
        ),
        ApiSchema.getStatusSuccess(endpoint.successSchema)
      ] as const
      options.onEndpoint({
        apiAnnotations: self.annotations,
        groupAnnotations,
        group,
        endpoint,
        annotations,
        success,
        errors
      })
    }
  }
}
