---
"@effect/platform": patch
---

Ensure the encoding kind of success responses is respected in the OpenAPI spec for GET requests.

Before

When generating an OpenAPI spec for a GET request with a success schema of type `HttpApiSchema.Text()``, the response content type was incorrectly set to "application/json" instead of "text/plain".

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi
} from "@effect/platform"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/").addSuccess(HttpApiSchema.Text())
  )
)

const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec.paths, null, 2))
/*
Output:
{
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
}
*/
```

After

```diff
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi
} from "@effect/platform"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/").addSuccess(HttpApiSchema.Text())
  )
)

const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec.paths, null, 2))
/*
Output:
{
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
-            "application/json": {
+            "text/plain": {
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
        }
      }
    }
  }
}
*/
```
