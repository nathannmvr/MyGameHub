export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Game Hub API",
    version: "1.0.0",
    description:
      "API REST do Game Hub Pessoal. Esta documentacao cobre os endpoints principais usados pelo frontend.",
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Local development",
    },
  ],
  tags: [
    { name: "Health" },
    { name: "Platforms" },
    { name: "Library" },
    { name: "Games" },
    { name: "Discover" },
    { name: "Steam" },
    { name: "Dashboard" },
  ],
  components: {
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Invalid request" },
            },
            required: ["code", "message"],
          },
        },
        required: ["success", "error"],
      },
      Platform: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          name: { type: "string" },
          manufacturer: { type: "string" },
          icon: { type: "string" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "userId", "name", "manufacturer", "icon", "isActive", "createdAt"],
      },
      CreatePlatformBody: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          manufacturer: { type: "string", minLength: 1, maxLength: 50 },
          icon: { type: "string", default: "gamepad" },
        },
        required: ["name", "manufacturer"],
      },
      LibraryItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { type: "string", enum: ["WISHLIST", "BACKLOG", "PLAYING", "PLAYED", "DROPPED"] },
          rating: { type: ["number", "null"] },
          playtimeHours: { type: ["number", "null"] },
          review: { type: ["string", "null"] },
          game: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              coverUrl: { type: ["string", "null"] },
              genres: { type: "array", items: { type: "string" } },
            },
          },
          platform: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              icon: { type: "string" },
            },
          },
        },
      },
      AddLibraryBody: {
        type: "object",
        properties: {
          rawgId: { type: "integer" },
          platformId: { type: "string" },
          status: { type: "string", enum: ["WISHLIST", "BACKLOG", "PLAYING", "PLAYED", "DROPPED"] },
          rating: { type: "integer", minimum: 1, maximum: 10 },
          playtimeHours: { type: "number", minimum: 0 },
          review: { type: "string" },
        },
        required: ["rawgId", "platformId", "status"],
      },
      GameSearchItem: {
        type: "object",
        properties: {
          rawgId: { type: "integer" },
          slug: { type: "string" },
          title: { type: "string" },
          coverUrl: { type: ["string", "null"] },
          releaseDate: { type: ["string", "null"] },
          genres: { type: "array", items: { type: "string" } },
          platforms: { type: "array", items: { type: "string" } },
          metacritic: { type: ["integer", "null"] },
          alreadyInLibrary: { type: "boolean" },
          reason: {
            type: "string",
            enum: ["GENRE_AFFINITY", "SIMILAR_TO_PLAYING", "TRENDING_ON_PLATFORM", "NEW_RELEASE_MATCH"],
          },
          scoreBreakdown: {
            type: "object",
            nullable: true,
            properties: {
              affinity: { type: "number" },
              diversity: { type: "number" },
              novelty: { type: "number" },
              robustness: { type: "number" },
              penalty: { type: "number" },
              final: { type: "number" },
            },
          },
        },
      },
      SyncJob: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          type: { type: "string", enum: ["STEAM"] },
          status: { type: "string", enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"] },
          totalItems: { type: "integer" },
          processedItems: { type: "integer" },
          errorMessage: { type: ["string", "null"] },
          startedAt: { type: "string", format: "date-time" },
          completedAt: { type: ["string", "null"], format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy",
          },
        },
      },
    },
    "/api/v1/platforms": {
      get: {
        tags: ["Platforms"],
        summary: "List user platforms",
        responses: {
          "200": {
            description: "Platforms list",
          },
        },
      },
      post: {
        tags: ["Platforms"],
        summary: "Create platform",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePlatformBody" },
            },
          },
        },
        responses: {
          "201": { description: "Platform created" },
          "409": { description: "Duplicate platform", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/api/v1/library": {
      get: {
        tags: ["Library"],
        summary: "List library items",
        responses: {
          "200": { description: "Paginated library" },
        },
      },
      post: {
        tags: ["Library"],
        summary: "Add game to library",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddLibraryBody" },
            },
          },
        },
        responses: {
          "201": { description: "Item created" },
          "404": { description: "Game/platform not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "409": { description: "Business rule conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/api/v1/games/search": {
      get: {
        tags: ["Games"],
        summary: "Search games",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": { description: "Search results" },
        },
      },
    },
    "/api/v1/discover": {
      get: {
        tags: ["Discover"],
        summary: "Get recommendations",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "profile", in: "query", schema: { type: "string", enum: ["conservative", "exploratory"] } },
          { name: "experimentGroup", in: "query", schema: { type: "string", enum: ["control", "treatment"] } },
          { name: "fallbackToTrending", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          "200": { description: "Recommendations page" },
        },
      },
    },
    "/api/v1/discover/feedback": {
      post: {
        tags: ["Discover"],
        summary: "Submit recommendation feedback/telemetry event",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rawgId: { type: "integer" },
                  title: { type: "string" },
                  reason: { type: "string" },
                  eventType: {
                    type: "string",
                    enum: ["IMPRESSION", "OPEN_DETAILS", "ADD_TO_LIBRARY", "DISMISS", "HIDE"],
                  },
                },
                required: ["rawgId"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Feedback accepted" },
        },
      },
    },
    "/api/v1/discover/metrics": {
      get: {
        tags: ["Discover"],
        summary: "Get aggregated recommendation metrics by experiment group",
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "experimentGroup", in: "query", schema: { type: "string", enum: ["control", "treatment"] } },
          { name: "k", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          "200": { description: "Aggregated metrics" },
        },
      },
    },
    "/api/v1/steam/sync": {
      post: {
        tags: ["Steam"],
        summary: "Start steam sync",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  steamId: { type: "string", example: "76561198000000000" },
                  platformId: { type: "string" },
                },
                required: ["steamId", "platformId"],
              },
            },
          },
        },
        responses: {
          "202": {
            description: "Sync started",
          },
          "409": { description: "Sync already running", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/api/v1/steam/sync/{jobId}": {
      get: {
        tags: ["Steam"],
        summary: "Get steam sync status",
        parameters: [
          {
            name: "jobId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Sync status",
          },
          "404": { description: "Sync job not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/api/v1/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard stats",
        responses: {
          "200": { description: "Dashboard stats" },
        },
      },
    },
  },
} as const;
