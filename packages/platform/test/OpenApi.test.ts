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
import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Context, Schema } from "effect"

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

type Parts = {
  readonly paths: OpenApi.OpenAPISpec["paths"]
  readonly tags?: OpenApi.OpenAPISpec["tags"] | undefined
  readonly securitySchemes?: Record<string, OpenApi.OpenAPISecurityScheme> | undefined
  readonly schemas?: Record<string, OpenApiJsonSchema.JsonSchema> | undefined
  readonly security?: Array<OpenApi.OpenAPISecurityRequirement> | undefined
}

type AdditionalPropertiesStrategy = "allow" | "strict"

type Options = {
  readonly additionalPropertiesStrategy?: AdditionalPropertiesStrategy | undefined
}

const getSpec = (parts: Parts, options?: Options): OpenApi.OpenAPISpec => {
  const additionalPropertiesStrategy = (options?.additionalPropertiesStrategy ?? "strict") === "allow"
  return {
    "openapi": "3.1.0",
    "info": { "title": "Api", "version": "0.0.1" },
    "paths": parts.paths,
    "tags": parts.tags ?? [{ "name": "group" }],
    "components": {
      "schemas": {
        "HttpApiDecodeError": {
          "type": "object",
          "required": ["issues", "message", "_tag"],
          "properties": {
            "issues": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Issue"
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
          "additionalProperties": additionalPropertiesStrategy,
          "description": "The request did not match the expected schema"
        },
        "Issue": {
          "type": "object",
          "description": "Represents an error encountered while parsing a value to match the schema",
          "required": ["_tag", "path", "message"],
          "properties": {
            "_tag": {
              "type": "string",
              "description": "The tag identifying the type of parse issue",
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
              "description": "The path to the property where the issue occurred",
              "items": {
                "$ref": "#/components/schemas/PropertyKey"
              }
            },
            "message": {
              "type": "string",
              "description": "A descriptive message explaining the issue"
            }
          },
          "additionalProperties": additionalPropertiesStrategy
        },
        "PropertyKey": {
          "anyOf": [
            { "type": "string" },
            { "type": "number" },
            {
              "additionalProperties": additionalPropertiesStrategy,
              "description": "an object to be decoded into a globally shared symbol",
              "properties": {
                "_tag": {
                  "enum": [
                    "symbol"
                  ],
                  "type": "string"
                },
                "key": { "type": "string" }
              },
              "required": ["_tag", "key"],
              "type": "object"
            }
          ]
        },
        ...parts.schemas
      },
      "securitySchemes": parts.securitySchemes ?? {}
    },
    "security": parts.security ?? []
  }
}

const expectParts = <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
  api: HttpApi.HttpApi<Id, Groups, E, R>,
  parts: Parts
) => {
  expectSpec(api, getSpec(parts))
}

const expectSpecPaths = <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
  api: HttpApi.HttpApi<Id, Groups, E, R>,
  paths: OpenApi.OpenAPISpec["paths"],
  options?: Options
) => {
  expectSpec(api, getSpec({ paths }, options), options)
}

const expectSpec = <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
  api: HttpApi.HttpApi<Id, Groups, E, R>,
  expected: OpenApi.OpenAPISpec,
  options?: Options
) => {
  const spec = OpenApi.fromApi(api, options)
  // console.log(JSON.stringify(spec.paths, null, 2))
  // console.log(JSON.stringify(spec, null, 2))
  deepStrictEqual(spec, expected)
}

const expectPaths = <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(
  api: HttpApi.HttpApi<Id, Groups, E, R>,
  paths: ReadonlyArray<string>
) => {
  const spec = OpenApi.fromApi(api)
  deepStrictEqual(Object.keys(spec.paths), paths)
}

describe("OpenApi", () => {
  describe("fromApi", () => {
    describe("HttpApi", () => {
      it(`additionalPropertiesStrategy: "allow"`, () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.Struct({ a: Schema.String }))
          )
        )
        expectSpecPaths(api, {
          "/": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [],
              "security": [],
              "responses": {
                "200": {
                  "description": "Success",
                  "content": {
                    "application/json": {
                      "schema": {
                        "type": "object",
                        "properties": {
                          "a": {
                            "type": "string"
                          }
                        },
                        "required": ["a"],
                        "additionalProperties": true
                      }
                    }
                  }
                },
                "400": HttpApiDecodeError
              }
            }
          }
        }, { additionalPropertiesStrategy: "allow" })
      })

      it("addHttpApi", () => {
        const anotherApi = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.String)
          )
        ).addError(Schema.String)

        const api = HttpApi.make("api")
          .addError(Schema.String)
          .addHttpApi(anotherApi)

        expectSpecPaths(api, {
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
                      "schema": { "type": "string" }
                    }
                  }
                }
              }
            }
          }
        })
      })

      it("prefix", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group1").add(
            HttpApiEndpoint.get("getGroup1Root", "/")
              .addSuccess(Schema.String)
          ).add(
            HttpApiEndpoint.get("getA", "/a")
              .addSuccess(Schema.String)
          )
        ).add(
          HttpApiGroup.make("group2").add(
            HttpApiEndpoint.get("getB", "/b")
              .addSuccess(Schema.String)
          )
        ).prefix("/prefix")
        expectPaths(api, ["/prefix", "/prefix/a", "/prefix/b"])
      })

      describe("addError", () => {
        it("no status annotation", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
            ).add(
              HttpApiEndpoint.get("getA", "/a")
                .addSuccess(Schema.String)
            )
          ).addError(Schema.String)
          expectSpecPaths(api, {
            "/": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.get",
                "parameters": [],
                "security": [],
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
            },
            "/a": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.getA",
                "parameters": [],
                "security": [],
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

        it("with status annotation", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
            ).add(
              HttpApiEndpoint.get("getA", "/a")
                .addSuccess(Schema.String)
            )
          ).addError(Schema.String, { status: 404 })
          expectSpecPaths(api, {
            "/": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.get",
                "parameters": [],
                "security": [],
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
            },
            "/a": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.getA",
                "parameters": [],
                "security": [],
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
      })

      it("annotate", () => {
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

      it("annotateContext", () => {
        const api = HttpApi.make("api")
          // TODO: why AdditionalSchemas is not an OpenApi annotation?
          .annotate(HttpApi.AdditionalSchemas, [
            Schema.String.annotations({ identifier: "MyString" })
          ])
          .annotateContext(OpenApi.annotations({
            description: "my description",
            license: { name: "MIT", url: "http://example.com" },
            summary: "my summary",
            servers: [{
              url: "http://example.com",
              description: "example",
              variables: { a: { default: "b", enum: ["c"], description: "d" } }
            }],
            override: { tags: [{ name: "a", description: "a-description" }] },
            transform: (spec) => ({ ...spec, tags: [...spec.tags, { "name": "b", "description": "b-description" }] })
          }))

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

    describe("HttpGroup", () => {
      it("topLevel: true", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group", { topLevel: true }).add(
            HttpApiEndpoint.get("get", "/")
              .addSuccess(Schema.String)
          )
        )
        expectSpecPaths(api, {
          "/": {
            "get": {
              "tags": ["group"],
              "operationId": "get",
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

      it("prefix", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("getRoot", "/")
              .addSuccess(Schema.String)
          ).add(
            HttpApiEndpoint.get("getA", "/a")
              .addSuccess(Schema.String)
          ).prefix("/prefix")
        )
        expectPaths(api, ["/prefix", "/prefix/a"])
      })

      describe("addError", () => {
        it("no status annotation", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
            ).add(
              HttpApiEndpoint.get("getA", "/a")
                .addSuccess(Schema.String)
            ).addError(Schema.String)
              .addError(Schema.String) // should dedupe the errors
          )
          expectSpecPaths(api, {
            "/": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.get",
                "parameters": [],
                "security": [],
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
            },
            "/a": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.getA",
                "parameters": [],
                "security": [],
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

        it("with status annotation", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
            ).add(
              HttpApiEndpoint.get("getA", "/a")
                .addSuccess(Schema.String)
            ).addError(Schema.String, { status: 404 })
          )
          expectSpecPaths(api, {
            "/": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.get",
                "parameters": [],
                "security": [],
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
            },
            "/a": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.getA",
                "parameters": [],
                "security": [],
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
      })

      it("annotate", () => {
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

    describe("HttpApiEndpoint", () => {
      it("prefix", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("getRoot", "/")
              .addSuccess(Schema.String)
              .prefix("/prefix1")
          ).add(
            HttpApiEndpoint.get("getA", "/a")
              .addSuccess(Schema.String)
              .prefix("/prefix2")
          )
        )
        expectPaths(api, ["/prefix1", "/prefix2/a"])
      })
    })

    describe("HttpApiEndpoint.get", () => {
      describe("addSuccess", () => {
        it("String", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
            )
          )
          expectSpecPaths(api, {
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
          })
        })

        it("Class API", () => {
          class User extends Schema.Class<User>("User")({
            id: Schema.Number
          }) {}

          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(User)
            )
          )
          expectParts(api, {
            schemas: {
              "User": {
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "type": "number"
                  }
                },
                "required": [
                  "id"
                ],
                "type": "object"
              }
            },
            paths: {
              "/": {
                "get": {
                  "tags": ["group"],
                  "operationId": "group.get",
                  "parameters": [],
                  "security": [],
                  "responses": {
                    "200": {
                      "description": "User",
                      "content": {
                        "application/json": {
                          "schema": { "$ref": "#/components/schemas/User" }
                        }
                      }
                    },
                    "400": HttpApiDecodeError
                  }
                }
              }
            }
          })
        })

        it("NoContent", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("getRoot", "/")
                .addSuccess(HttpApiSchema.NoContent)
            ).add(
              HttpApiEndpoint.get("getA", "/a")
                .addSuccess(HttpApiSchema.NoContent.annotations({ description: "my description" }))
            )
          )
          expectSpecPaths(api, {
            "/": {
              "get": {
                "tags": ["group"],
                "operationId": "group.getRoot",
                "parameters": [],
                "security": [],
                "responses": {
                  "204": {
                    "description": "Success"
                  },
                  "400": HttpApiDecodeError
                }
              }
            },
            "/a": {
              "get": {
                "tags": ["group"],
                "operationId": "group.getA",
                "parameters": [],
                "security": [],
                "responses": {
                  "204": {
                    "description": "my description"
                  },
                  "400": HttpApiDecodeError
                }
              }
            }
          })
        })
      })

      describe("addSuccess + withEncoding", () => {
        it("HttpApiSchema.Text()", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(HttpApiSchema.Text())
            )
          )
          expectSpecPaths(api, {
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
                      "text/plain": {
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
        expectSpecPaths(api, expected)
        // should cache the result
        expectSpecPaths(api, expected)
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
        expectSpecPaths(api, {
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

      it("setPath as template string", () => {
        const a = Schema.String
        const b = Schema.String.annotations({ description: "my description" })
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get")`/a/${a}/b/${b}`
              .addSuccess(Schema.String)
          )
        )
        expectSpecPaths(api, {
          "/a/{0}/b/{1}": {
            "get": {
              "tags": ["group"],
              "operationId": "group.get",
              "parameters": [
                {
                  "name": "0",
                  "in": "path",
                  "schema": { "type": "string" },
                  "required": true
                },
                {
                  "name": "1",
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

      it("setPath as template string with HttpApiSchema.param", () => {
        const a = Schema.String
        const b = Schema.String.annotations({ description: "my description" })
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.get("get")`/a/${HttpApiSchema.param("a", a)}/b/${HttpApiSchema.param("b", b)}`
              .addSuccess(Schema.String)
          )
        )
        expectSpecPaths(api, {
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
        expectSpecPaths(api, {
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
        expectSpecPaths(api, {
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

      describe("addError", () => {
        it("no status annotation", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
                .addError(Schema.String)
                .addError(Schema.String) // should dedupe the errors
            )
          )
          expectSpecPaths(api, {
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

        it("status annotation", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
                .addError(Schema.String, { status: 404 })
            )
          )
          expectSpecPaths(api, {
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

        it("asEmpty", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addSuccess(Schema.String)
                .addError(Schema.String.pipe(
                  HttpApiSchema.asEmpty({ status: 418, decode: () => "I'm a teapot" })
                ))
            )
          )
          expectSpecPaths(api, {
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
                  "418": {
                    "description": "a string"
                  }
                }
              }
            }
          })
        })
      })

      describe("addSError + withEncoding", () => {
        it("HttpApiSchema.Text()", () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.get("get", "/")
                .addError(HttpApiSchema.Text())
            )
          )
          expectSpecPaths(api, {
            "/": {
              "get": {
                "tags": [
                  "group"
                ],
                "operationId": "group.get",
                "parameters": [],
                "security": [],
                "responses": {
                  "204": {
                    "description": "Success"
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
                  "500": {
                    "description": "a string",
                    "content": {
                      "text/plain": {
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
      })

      it("annotate", () => {
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
        expectSpecPaths(api, {
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
        expectSpecPaths(api, {
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
        expectParts(api, {
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
                          "$ref": "#/components/schemas/Unauthorized"
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
              .setPayload(Schema.Union(
                Schema.Struct({ a: Schema.String }),
                Schema.Struct({ b: Schema.String }).pipe(
                  HttpApiSchema.withEncoding({ kind: "UrlParams" })
                ),
                HttpApiSchema.Multipart(
                  Schema.Struct({ c: Schema.String })
                )
              ))
          )
        )
        expectSpecPaths(api, {
          "/": {
            "post": {
              "tags": ["group"],
              "operationId": "group.post",
              "parameters": [],
              "security": [],
              "requestBody": {
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "required": [
                        "a"
                      ],
                      "properties": {
                        "a": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    }
                  },
                  "application/x-www-form-urlencoded": {
                    "schema": {
                      "type": "object",
                      "required": [
                        "b"
                      ],
                      "properties": {
                        "b": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    }
                  },
                  "multipart/form-data": {
                    "schema": {
                      "type": "object",
                      "required": [
                        "c"
                      ],
                      "properties": {
                        "c": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    }
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

      it("Multipart", () => {
        const api = HttpApi.make("api").add(
          HttpApiGroup.make("group").add(
            HttpApiEndpoint.post("post", "/")
              .addSuccess(Schema.String)
              .setPayload(
                // Mark the payload as a multipart request
                HttpApiSchema.Multipart(
                  Schema.Struct({
                    // Define a "files" field for the uploaded files
                    files: Multipart.FilesSchema
                  })
                )
              )
          )
        )
        expectParts(api, {
          schemas: {
            "PersistedFile": {
              "type": "string",
              "format": "binary"
            }
          },
          paths: {
            "/": {
              "post": {
                "tags": ["group"],
                "operationId": "group.post",
                "parameters": [],
                "security": [],
                "requestBody": {
                  "content": {
                    "multipart/form-data": {
                      "schema": {
                        "type": "object",
                        "required": [
                          "files"
                        ],
                        "properties": {
                          "files": {
                            "type": "array",
                            "items": {
                              "$ref": "#/components/schemas/PersistedFile"
                            }
                          }
                        },
                        "additionalProperties": false
                      }
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
          }
        })
      })

      describe("withEncoding", () => {
        it(`kind: "Text"`, () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.post("post", "/")
                .addSuccess(Schema.String)
                .setPayload(Schema.String.pipe(
                  HttpApiSchema.withEncoding({
                    kind: "Text",
                    contentType: "application/xml"
                  })
                ))
            )
          )
          const expected: OpenApi.OpenAPISpec["paths"] = {
            "/": {
              "post": {
                "tags": ["group"],
                "operationId": "group.post",
                "parameters": [],
                "requestBody": {
                  "content": {
                    "application/xml": {
                      "schema": {
                        "type": "string"
                      }
                    }
                  },
                  "required": true
                },
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
          expectSpecPaths(api, expected)
        })

        it(`kind: "UrlParams"`, () => {
          const api = HttpApi.make("api").add(
            HttpApiGroup.make("group").add(
              HttpApiEndpoint.post("post", "/")
                .addSuccess(Schema.String)
                .setPayload(
                  Schema.Struct({ foo: Schema.String }).pipe(
                    HttpApiSchema.withEncoding({ kind: "UrlParams" })
                  )
                )
            )
          )
          const expected: OpenApi.OpenAPISpec["paths"] = {
            "/": {
              "post": {
                "tags": ["group"],
                "operationId": "group.post",
                "parameters": [],
                "security": [],
                "requestBody": {
                  "content": {
                    "application/x-www-form-urlencoded": {
                      "schema": {
                        "type": "object",
                        "required": [
                          "foo"
                        ],
                        "properties": {
                          "foo": {
                            "type": "string"
                          }
                        },
                        "additionalProperties": false
                      }
                    }
                  },
                  "required": true
                },
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
                  "400": HttpApiDecodeError
                }
              }
            }
          }
          expectSpecPaths(api, expected)
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
        expectSpecPaths(api, {
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
        expectSpecPaths(api, {
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
        expectSpecPaths(api, {
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
        expectSpecPaths(api, {
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

    it("should dedupe the errors", () => {
      const err = Schema.String.annotations({ identifier: "err" })
      const api = HttpApi.make("api")
        .add(
          HttpApiGroup.make("group1")
            .add(
              HttpApiEndpoint.get("get1", "/1")
                .addSuccess(Schema.String)
                .addError(err).addError(err)
            ).add(
              HttpApiEndpoint.get("get2", "/2")
                .addSuccess(Schema.String)
                .addError(err).addError(err)
            ).addError(err).addError(err)
        ).addError(err).addError(err)
        .add(
          HttpApiGroup.make("group2")
            .add(
              HttpApiEndpoint.get("get3", "/3")
                .addSuccess(Schema.String)
                .addError(err).addError(err)
            ).add(
              HttpApiEndpoint.get("get4", "/4")
                .addSuccess(Schema.String)
                .addError(err).addError(err)
            ).addError(err).addError(err)
        ).addError(err).addError(err)
      expectParts(api, {
        tags: [{ name: "group1" }, { name: "group2" }],
        schemas: {
          "err": {
            "type": "string"
          }
        },
        paths: {
          "/1": {
            "get": {
              "tags": [
                "group1"
              ],
              "operationId": "group1.get1",
              "parameters": [],
              "security": [],
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
                "500": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/err"
                      }
                    }
                  }
                }
              }
            }
          },
          "/2": {
            "get": {
              "tags": [
                "group1"
              ],
              "operationId": "group1.get2",
              "parameters": [],
              "security": [],
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
                "500": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/err"
                      }
                    }
                  }
                }
              }
            }
          },
          "/3": {
            "get": {
              "tags": [
                "group2"
              ],
              "operationId": "group2.get3",
              "parameters": [],
              "security": [],
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
                "500": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/err"
                      }
                    }
                  }
                }
              }
            }
          },
          "/4": {
            "get": {
              "tags": [
                "group2"
              ],
              "operationId": "group2.get4",
              "parameters": [],
              "security": [],
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
                "500": {
                  "description": "a string",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/err"
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
})
