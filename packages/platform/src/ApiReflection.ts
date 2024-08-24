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
  inherited: ReadonlyMap<number, AST.AST>
): ReadonlyMap<number, AST.AST> => {
  const topStatus = ApiSchema.getStatusErrorAST(ast)
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
    readonly onGroup: (options: {
      readonly group: ApiGroup.ApiGroup<string, any>
      readonly mergedAnnotations: Context.Context<never>
    }) => void
    readonly onEndpoint: (options: {
      readonly group: ApiGroup.ApiGroup<string, any>
      readonly endpoint: ApiEndpoint.ApiEndpoint<string, HttpMethod>
      readonly mergedAnnotations: Context.Context<never>
      readonly success: readonly [ast: Option.Option<AST.AST>, status: number]
      readonly errors: ReadonlyMap<number, AST.AST>
    }) => void
  }
) => {
  const apiErrors = extractErrors(self.errorSchema.ast, new Map())

  const groups = self.groups as Iterable<ApiGroup.ApiGroup<string, any>>
  for (const group of groups) {
    const groupErrors = extractErrors(group.errorSchema.ast, apiErrors)
    const groupAnnotations = Context.merge(self.annotations, group.annotations)
    options.onGroup({
      group,
      mergedAnnotations: groupAnnotations
    })
    const endpoints = group.endpoints as Iterable<ApiEndpoint.ApiEndpoint<string, HttpMethod>>

    for (const endpoint of endpoints) {
      const errors = extractErrors(endpoint.errorSchema.ast, groupErrors)
      const annotations = Context.merge(groupAnnotations, endpoint.annotations)
      const success = [
        ApiEndpoint.schemaSuccess(endpoint).pipe(
          Option.map((schema) => schema.ast)
        ),
        ApiSchema.getStatusSuccess(endpoint.successSchema)
      ] as const
      options.onEndpoint({
        group,
        endpoint,
        mergedAnnotations: annotations,
        success,
        errors
      })
    }
  }
}
