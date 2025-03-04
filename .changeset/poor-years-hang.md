---
"@effect/platform": patch
"effect": patch
---

Add `additionalPropertiesStrategy` option to `OpenApi.fromApi`, closes #4531.

This update introduces the `additionalPropertiesStrategy` option in `OpenApi.fromApi`, allowing control over how additional properties are handled in the generated OpenAPI schema.

- When `"strict"` (default), additional properties are disallowed (`"additionalProperties": false`).
- When `"allow"`, additional properties are allowed (`"additionalProperties": true`), making APIs more flexible.

The `additionalPropertiesStrategy` option has also been added to:

- `JSONSchema.fromAST`
- `OpenApiJsonSchema.makeWithDefs`

**Example**

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from "@effect/platform"
import { Schema } from "effect"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/").addSuccess(
      Schema.Struct({ a: Schema.String })
    )
  )
)

const schema = OpenApi.fromApi(api, {
  additionalPropertiesStrategy: "allow"
})

console.log(JSON.stringify(schema, null, 2))
/*
{
  "openapi": "3.1.0",
  "info": {
    "title": "Api",
    "version": "0.0.1"
  },
  "paths": {
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
            "description": "Success",
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
                  "additionalProperties": true
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
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "HttpApiDecodeError": {
        "type": "object",
        "required": [
          "issues",
          "message",
          "_tag"
        ],
        "properties": {
          "issues": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Issue"
            }
          },
          "message": {
            "type": "string"
          },
          "_tag": {
            "type": "string",
            "enum": [
              "HttpApiDecodeError"
            ]
          }
        },
        "additionalProperties": true,
        "description": "The request did not match the expected schema"
      },
      "Issue": {
        "type": "object",
        "required": [
          "_tag",
          "path",
          "message"
        ],
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
            ],
            "description": "The tag identifying the type of parse issue"
          },
          "path": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/PropertyKey"
            },
            "description": "The path to the property where the issue occurred"
          },
          "message": {
            "type": "string",
            "description": "A descriptive message explaining the issue"
          }
        },
        "additionalProperties": true,
        "description": "Represents an error encountered while parsing a value to match the schema"
      },
      "PropertyKey": {
        "anyOf": [
          {
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "type": "object",
            "required": [
              "_tag",
              "key"
            ],
            "properties": {
              "_tag": {
                "type": "string",
                "enum": [
                  "symbol"
                ]
              },
              "key": {
                "type": "string"
              }
            },
            "additionalProperties": true,
            "description": "an object to be decoded into a globally shared symbol"
          }
        ]
      }
    },
    "securitySchemes": {}
  },
  "security": [],
  "tags": [
    {
      "name": "group"
    }
  ]
}
*/
```
