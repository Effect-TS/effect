import type { OpenApiJsonSchema } from "@effect/platform"
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  Multipart,
  OpenApi
} from "@effect/platform"
import { Context, Schema, Struct } from "effect"
import { assert, describe, expect, it } from "vitest"
import OpenApiFixture from "./fixtures/openapi.json" with { type: "json" }

const HttpApiDecodeError = {
  "description": "The request did not match the expected schema",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/HttpApiDecodeError"
      }
    }
  }
}

type Options = {
  readonly paths: OpenApi.OpenAPISpec["paths"]
  readonly securitySchemes?: Record<string, OpenApi.OpenAPISecurityScheme> | undefined
  readonly schemas?: Record<string, OpenApiJsonSchema.JsonSchema> | undefined
  readonly security?: Array<OpenApi.OpenAPISecurityRequirement> | undefined
}

const getSpec = (options: Options): OpenApi.OpenAPISpec => {
  return {
    "openapi": "3.1.0",
    "info": { "title": "Api", "version": "0.0.1" },
    "paths": options.paths,
    "tags": [{ "name": "group" }],
    "components": {
      "schemas": {
        "HttpApiDecodeError": {
          "type": "object",
          "required": ["issues", "message", "_tag"],
          "properties": {
            "issues": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["_tag", "path", "message"],
                "properties": {
                  "_tag": {
                    "type": "string",
                    "enum": [
                      "Pointer",
                      "Unexpected",
                      "Missing",
                      "Composite",
                      "Refinement",
                      "Transformation",
                      "Type",
                      "Forbidden"
                    ]
                  },
                  "path": {
                    "type": "array",
                    "items": {
                      "anyOf": [{ "type": "string" }, { "type": "number" }]
                    }
                  },
                  "message": { "type": "string" }
                },
                "additionalProperties": false
              }
            },
            "message": { "type": "string" },
            "_tag": {
              "type": "string",
              "enum": [
                "HttpApiDecodeError"
              ]
            }
          },
          "additionalProperties": false,
          "description": "The request did not match the expected schema"
        },
        ...options.schemas
      },
      "securitySchemes": options.securitySchemes ?? {}
    },
    "security": options.security ?? []
  }
}

const expectOptions = (api: HttpApi.HttpApi.Any, options: Options) => {
  expectSpec(api, getSpec(options))
}

const expectPaths = (api: HttpApi.HttpApi.Any, paths: OpenApi.OpenAPISpec["paths"]) => {
  expectSpec(api, getSpec({ paths }))
}

const expectSpec = (api: HttpApi.HttpApi.Any, expected: OpenApi.OpenAPISpec) => {
  const spec = OpenApi.fromApi(api)
  // console.log(JSON.stringify(spec.paths, null, 2))
  // console.log(JSON.stringify(spec, null, 2))
  expect(spec).toStrictEqual(expected)
}

describe("OpenApi", () => {
  describe("fromApi", () => {
    describe("HttpApi.make", () => {
      it("annotations", () => {
        const api = HttpApi.make("api")
          .annotate(HttpApi.AdditionalSchemas, [
            Schema.String.annotations({ identifier: "MyString" }),
            Schema.Number // TODO without an identifier annotation it doesn't appear in the output, correct?
          ])
          .annotate(OpenApi.Description, "my description")
          .annotate(OpenApi.License, { name: "MIT", url: "http://example.com" })
          .annotate(OpenApi.Summary, "my summary")
          .annotate(OpenApi.Servers, [{
            url: "http://example.com",
            description: "example",
            variables: { a: { default: "b", enum: ["c"], description: "d" } }
          }])
          .annotate(OpenApi.Override, { tags: [{ name: "a", description: "a-description" }] })
          .annotate(
            OpenApi.Transform,
            (spec) => ({ ...spec, tags: [...spec.tags, { "name": "b", "description": "b-description" }] })
          )
        expectSpec(api, {
          "openapi": "3.1.0",
          "info": {
            "title": "Api",
            "version": "0.0.1",
            "description": "my description",
            "license": {
              "name": "MIT",
              "url": "http://example.com"
            },
            "summary": "my summary"
          },
          "paths": {},
          "tags": [
            { "name": "a", "description": "a-description" },
            { "name": "b", "description": "b-description" }
          ],
          "components": {
            "schemas": {
              "MyString": {
                "type": "string"
              }
            },
            "securitySchemes": {}
          },
          "security": [],
          "servers": [
            {
              "url": "http://example.com",
              "description": "example",
              "variables": {
                "a": {
                  "default": "b",
                  "enum": [
                    "c"
                  ],
                  "description": "d"
                }
              }
            }
          ]
        })
      })
    })

    describe("HttpGroup.make", () => {
      it("annotations", () => {
        const api = HttpApi.make("api")
          .add(
            HttpApiGroup.make("group")
              .annotate(OpenApi.Description, "my description")
              .annotate(OpenApi.ExternalDocs, { url: "http://example.com", description: "example" })
              .annotate(OpenApi.Override, { name: "my name" })
              .annotate(OpenApi.Transform, (spec) => ({ ...spec, name: spec.name + "-transformed" }))
          )
          .add(HttpApiGroup.make("excluded").annotate(OpenApi.Exclude, true))

        expectSpec(api, {
          "openapi": "3.1.0",
          "info": {
            "title": "Api",
            "version": "0.0.1"
          },
          "paths": {},
          "tags": [{
            "name": "my name-transformed",
            "description": "my description",
            "externalDocs": {
              "description": "example",
              "url": "http://example.com"
            }
          }],
          "components": {
            "schemas": {},
            "securitySchemes": {}
          },
          "security": []
        })
      })
    })

    describe("HttpApiEndpoint.get", () => {
      it("addSuccess", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.String)
          )
        )
        const expected: OpenApi.OpenAPISpec["paths"] = {
          "/": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        }
        expectPaths(api, expected)
        // should cache the result
        expectPaths(api, expected)
      })

      it("setPayload", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.String)
              .setPayload(Schema.Struct({
                a: Schema.String,
                // with description
                b: Schema.String.annotations({ description: "my description" })
              }))
          )
        )
        const expected: OpenApi.OpenAPISpec["paths"] = {
          "/": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [
                {
                  "name": "a",
                  "in": "query",
                  "schema": { "type": "string" },
                  "required": true
                },
                {
                  "name": "b",
                  "in": "query",
                  "schema": {
                    "type": "string",
                    "description": "my description"
                  },
                  "required": true,
                  "description": "my description"
                }
              ],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        }
        expectPaths(api, expected)
        // should cache the result
        expectPaths(api, expected)
      })

      it("setPath", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/a/:a/b/:b")
              .setPath(Schema.Struct({
                a: Schema.String,
                // with description
                b: Schema.String.annotations({ description: "my description" })
              }))
              .addSuccess(Schema.String)
          )
        )
        expectPaths(api, {
          "/a/{a}/b/{b}": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [
                {
                  "name": "a",
                  "in": "path",
                  "schema": { "type": "string" },
                  "required": true
                },
                {
                  "name": "b",
                  "in": "path",
                  "schema": {
                    "type": "string",
                    "description": "my description"
                  },
                  "required": true,
                  "description": "my description"
                }
              ],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })

      it("setUrlParams", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .setUrlParams(Schema.Struct({
                a: Schema.String,
                // with description
                b: Schema.String.annotations({ description: "my description" })
              }))
              .addSuccess(Schema.String)
          )
        )
        expectPaths(api, {
          "/": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [
                {
                  "name": "a",
                  "in": "query",
                  "schema": { "type": "string" },
                  "required": true
                },
                {
                  "name": "b",
                  "in": "query",
                  "schema": {
                    "type": "string",
                    "description": "my description"
                  },
                  "required": true,
                  "description": "my description"
                }
              ],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })

      it("setHeaders", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .setHeaders(Schema.Struct({
                a: Schema.String,
                // with description
                b: Schema.String.annotations({ description: "my description" })
              }))
              .addSuccess(Schema.String)
          )
        )
        expectPaths(api, {
          "/": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [
                {
                  "name": "a",
                  "in": "header",
                  "schema": { "type": "string" },
                  "required": true
                },
                {
                  "name": "b",
                  "in": "header",
                  "schema": {
                    "type": "string",
                    "description": "my description"
                  },
                  "required": true,
                  "description": "my description"
                }
              ],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })

      it("addError", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.String)
              .addError(Schema.String)
          )
        )
        expectPaths(api, {
          "/": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError,
                "500": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          }
        })
      })

      it("addError + status annotation", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.String)
              .addError(Schema.String, { status: 404 })
          )
        )
        expectPaths(api, {
          "/": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError,
                "404": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          }
        })
      })

      it("annotations", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.String)
              .annotate(OpenApi.Description, "my description")
              .annotate(OpenApi.Summary, "my summary")
              .annotate(OpenApi.Deprecated, true)
              .annotate(OpenApi.ExternalDocs, { url: "http://example.com", description: "example" })
              .annotate(OpenApi.Override, { operationId: "my operationId" })
              .annotate(OpenApi.Transform, (spec) => ({ ...spec, operationId: spec.operationId + "-transformed" }))
          ).add(
            HttpApiEndpoint.get("excluded", "/excluded")
              .addSuccess(Schema.String)
              .annotate(OpenApi.Exclude, true)
          )
        )
        expectPaths(api, {
          "/": {
            "get": {
              "description": "my description",
              "summary": "my summary",
              "deprecated": true,
              "externalDocs": { "url": "http://example.com", "description": "example" },
              "tags": ["group"],
              "operationId": "my operationId-transformed",
              "parameters": [],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })

      it("annotateContext", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.String)
              .annotateContext(OpenApi.annotations({
                description: "my description",
                summary: "my summary",
                deprecated: true,
                externalDocs: { url: "http://example.com", description: "example" },
                override: { operationId: "my operationId" },
                transform: (spec) => ({ ...spec, operationId: spec.operationId + "-transformed" })
              }))
          ).add(
            HttpApiEndpoint.get("excluded", "/excluded")
              .addSuccess(Schema.String)
              .annotate(OpenApi.Exclude, true)
          )
        )
        expectPaths(api, {
          "/": {
            "get": {
              "description": "my description",
              "summary": "my summary",
              "deprecated": true,
              "externalDocs": { "url": "http://example.com", "description": "example" },
              "tags": ["group"],
              "operationId": "my operationId-transformed",
              "parameters": [],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })

      it("Security Middleware", () => {
        // Define a schema for the "Unauthorized" error
        class Unauthorized extends Schema.TaggedError<Unauthorized>()(
          "Unauthorized",
          {},
          // Specify the HTTP status code for unauthorized errors
          HttpApiSchema.annotations({ status: 401 })
        ) {}

        class Resource extends Context.Tag("Resource")<Resource, string>() {}

        // Create the Authorization middleware
        class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
          "Authorization",
          {
            failure: Unauthorized,
            provides: Resource,
            security: {
              myBearer: HttpApiSecurity.bearer,
              myApiKey: HttpApiSecurity.apiKey({ in: "cookie", key: "mykey" }),
              myBasic: HttpApiSecurity.basic,
              myAnnotatedBearer: HttpApiSecurity.annotate(
                HttpApiSecurity.bearer,
                OpenApi.Description,
                "myAnnotatedBearer description"
              )
            }
          }
        ) {}
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group")
            .add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
                // Apply the middleware to a single endpoint
                .middleware(Authorization)
            )
            // Or apply the middleware to the entire group
            .middleware(Authorization)
        )
          // Or apply the middleware to the entire API
          .middleware(Authorization)
        expectOptions(api, {
          security: [{
            "myBearer": []
          }, {
            "myApiKey": []
          }, {
            "myBasic": []
          }, {
            "myAnnotatedBearer": []
          }],
          securitySchemes: {
            "myBearer": {
              "type": "http",
              "scheme": "bearer"
            },
            "myApiKey": {
              "in": "cookie",
              "name": "mykey",
              "type": "apiKey"
            },
            "myBasic": {
              "scheme": "basic",
              "type": "http"
            },
            "myAnnotatedBearer": {
              "type": "http",
              "scheme": "bearer",
              "description": "myAnnotatedBearer description"
            }
          },
          schemas: {
            "Unauthorized": {
              "type": "object",
              "required": [
                "_tag"
              ],
              "properties": {
                "_tag": {
                  "type": "string",
                  "enum": [
                    "Unauthorized"
                  ]
                }
              },
              "additionalProperties": false
            }
          },
          paths: {
            "/": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.get",
                "parameters": [],
                "security": [
                  {
                    "myBearer": []
                  },
                  {
                    "myApiKey": []
                  },
                  {
                    "myBasic": []
                  },
                  {
                    "myAnnotatedBearer": []
                  }
                ],
                "responses": {
                  "200": {
                    "description": "a string",
                    "content": {
                      "application/json": {
                        "schema": {
                          "type": "string"
                        }
                      }
                    }
                  },
                  "400": {
                    "description": "The request did not match the expected schema",
                    "content": {
                      "application/json": {
                        "schema": {
                          "$ref": "#/components/schemas/HttpApiDecodeError"
                        }
                      }
                    }
                  },
                  "401": {
                    "description": "Unauthorized",
                    "content": {
                      "application/json": {
                        "schema": {
                          "anyOf": [
                            {
                              "$ref": "#/components/schemas/Unauthorized" // TODO: deduplicate?
                            },
                            {
                              "$ref": "#/components/schemas/Unauthorized"
                            },
                            {
                              "$ref": "#/components/schemas/Unauthorized"
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        })
      })
    })

    describe("HttpApiEndpoint.post", () => {
      it("setPayload", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.post("post", "/")
              .addSuccess(Schema.String)
              .setPayload(Schema.Number)
          )
        )
        expectPaths(api, {
          "/": {
            "post": {
              "tags": ["group"],
              "operationId": "group.post",
              "parameters": [],
              "security": [],
              "requestBody": {
                "content": {
                  "application/json": {
                    "schema": { "type": "number" }
                  }
                },
                "required": true
              },
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })
    })

    describe("HttpApiEndpoint.del", () => {
      it("addSuccess", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.del("del", "/")
              .addSuccess(Schema.String)
          )
        )
        expectPaths(api, {
          "/": {
            "delete": {
              "tags": ["group"],
              "operationId": "group.del",
              "parameters": [],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })

      it("setPath", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.del("del", "/a/:id/b")
              .setPath(Schema.Struct({ id: Schema.String }))
              .addSuccess(Schema.String)
          )
        )
        expectPaths(api, {
          "/a/{id}/b": {
            "delete": {
              "tags": ["group"],
              "operationId": "group.del",
              "parameters": [
                {
                  "name": "id",
                  "in": "path",
                  "schema": { "type": "string" },
                  "required": true
                }
              ],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })

      it("setUrlParams", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.del("del", "/")
              .setUrlParams(Schema.Struct({ id: Schema.String }))
              .addSuccess(Schema.String)
          )
        )
        expectPaths(api, {
          "/": {
            "delete": {
              "tags": ["group"],
              "operationId": "group.del",
              "parameters": [
                {
                  "name": "id",
                  "in": "query",
                  "schema": { "type": "string" },
                  "required": true
                }
              ],
              "security": [],
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })
    })

    describe("HttpApiEndpoint.patch", () => {
      it("setPayload", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.patch("patch", "/")
              .addSuccess(Schema.String)
              .setPayload(Schema.Number)
          )
        )
        expectPaths(api, {
          "/": {
            "patch": {
              "tags": ["group"],
              "operationId": "group.patch",
              "parameters": [],
              "security": [],
              "requestBody": {
                "content": {
                  "application/json": {
                    "schema": { "type": "number" }
                  }
                },
                "required": true
              },
              "responses": {
                "200": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": { "type": "string" }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        })
      })
    })
  })

  it.skip("OpenAPI spec", () => {
    class GlobalError extends Schema.TaggedClass<GlobalError>()("GlobalError", {}) {}
    class GroupError extends Schema.TaggedClass<GroupError>()("GroupError", {}) {}
    class UserError
      extends Schema.TaggedClass<UserError>()("UserError", {}, HttpApiSchema.annotations({ status: 400 }))
    {}
    class NoStatusError extends Schema.TaggedClass<NoStatusError>()("NoStatusError", {}) {}

    class User extends Schema.Class<User>("User")({
      id: Schema.Int,
      uuid: Schema.optional(Schema.UUID),
      name: Schema.String,
      createdAt: Schema.DateTimeUtc
    }) {}

    class Group extends Schema.Class<Group>("Group")({
      id: Schema.Int,
      name: Schema.String
    }) {}

    class GroupsApi extends HttpApiGroup.make("groups")
      .add(
        HttpApiEndpoint.get("findById")`/${HttpApiSchema.param("id", Schema.NumberFromString)}`
          .addSuccess(Group)
      )
      .add(
        HttpApiEndpoint.post("create")`/`
          .setPayload(Schema.Union(
            Schema.Struct(Struct.pick(Group.fields, "name")),
            Schema.Struct({ foo: Schema.String }).pipe(
              HttpApiSchema.withEncoding({ kind: "UrlParams" })
            ),
            HttpApiSchema.Multipart(
              Schema.Struct(Struct.pick(Group.fields, "name"))
            )
          ))
          .addSuccess(Group)
      )
      .addError(GroupError.pipe(
        HttpApiSchema.asEmpty({ status: 418, decode: () => new GroupError() })
      ))
      .prefix("/groups")
    {}

    class AnotherApi extends HttpApi.make("another").add(GroupsApi) {}

    class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

    class Authorization extends HttpApiMiddleware.Tag<Authorization>()("Authorization", {
      security: {
        cookie: HttpApiSecurity.apiKey({
          in: "cookie",
          key: "token"
        })
      },
      provides: CurrentUser
    }) {}

    class UsersApi extends HttpApiGroup.make("users")
      .add(
        HttpApiEndpoint.get("findById")`/${HttpApiSchema.param("id", Schema.NumberFromString)}`
          .addSuccess(User)
      )
      .add(
        HttpApiEndpoint.post("create")`/`
          .setPayload(Schema.Struct(Struct.omit(
            User.fields,
            "id",
            "createdAt"
          )))
          .setUrlParams(Schema.Struct({
            id: Schema.NumberFromString
          }))
          .addSuccess(User)
          .addError(UserError)
          .addError(UserError) // ensure errors are deduplicated
      )
      .add(
        HttpApiEndpoint.get("list")`/`
          .setHeaders(Schema.Struct({
            page: Schema.NumberFromString.pipe(
              Schema.optionalWith({ default: () => 1 })
            )
          }))
          .setUrlParams(Schema.Struct({
            query: Schema.optional(Schema.String).annotations({ description: "search query" })
          }))
          .addSuccess(Schema.Array(User))
          .addError(NoStatusError)
          .annotate(OpenApi.Deprecated, true)
          .annotate(OpenApi.Summary, "test summary")
          .annotateContext(OpenApi.annotations({ identifier: "listUsers" }))
      )
      .add(
        HttpApiEndpoint.post("upload")`/upload`
          .setPayload(HttpApiSchema.Multipart(Schema.Struct({
            file: Multipart.SingleFileSchema
          })))
          .addSuccess(Schema.Struct({
            contentType: Schema.String,
            length: Schema.Int
          }))
      )
      .middleware(Authorization)
      .annotateContext(OpenApi.annotations({ title: "Users API" }))
    {}

    class TopLevelApi extends HttpApiGroup.make("root", { topLevel: true })
      .add(
        HttpApiEndpoint.get("healthz")`/healthz`
          .addSuccess(HttpApiSchema.NoContent.annotations({ description: "Empty" }))
      )
    {}

    class Api extends HttpApi.make("api")
      .addHttpApi(AnotherApi)
      .add(UsersApi.prefix("/users"))
      .add(TopLevelApi)
      .addError(GlobalError, { status: 413 })
      .annotateContext(OpenApi.annotations({
        title: "API",
        summary: "test api summary",
        transform: (openApiSpec) => ({
          ...openApiSpec,
          tags: [...openApiSpec.tags ?? [], {
            name: "Tag from OpenApi.Transform annotation"
          }]
        })
      }))
      .annotate(
        HttpApi.AdditionalSchemas,
        [
          Schema.Struct({
            contentType: Schema.String,
            length: Schema.Int
          }).annotations({
            identifier: "ComponentsSchema"
          })
        ]
      )
    {}

    const spec = OpenApi.fromApi(Api)
    assert.deepStrictEqual(spec, OpenApiFixture as any)
  })
})
