#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";

const PERIOD = [
  "today",
  "1h",
  "24h",
  "7d",
  "30d",
  "6m",
  "12m",
  "all_time",
  "month_to_date",
  "week_to_date",
  "year_to_date",
];

const INTERVAL = ["10 minutes", "1 hour", "1 day", "1 month"];

const FILTER_KEYS = [
  "page",
  "entryPage",
  "exitPage",
  "event",
  "hostname",
  "country",
  "region",
  "city",
  "browser",
  "device",
  "referrer",
  "campaign",
  "source",
  "medium",
  "content",
  "term",
  "os",
  "tag",
  "field",
];

const commonFilterDescription =
  "Use Seline filter syntax with prefixes: 'is:', 'contains:', 'is not:', 'does not contain:'. Separate multiple conditions with ';', e.g. country=is:DZ;is:AT.";

const filter = z
  .object({
    page: z
      .string()
      .optional()
      .describe(`Page pathname filter (${commonFilterDescription})`),
    entryPage: z
      .string()
      .optional()
      .describe(`Entry page pathname filter (${commonFilterDescription})`),
    exitPage: z
      .string()
      .optional()
      .describe(`Exit page pathname filter (${commonFilterDescription})`),
    event: z
      .string()
      .optional()
      .describe(`Custom event name filter (${commonFilterDescription})`),
    hostname: z
      .string()
      .optional()
      .describe(`Hostname filter (${commonFilterDescription})`),
    country: z
      .string()
      .optional()
      .describe(
        `Country filter (${commonFilterDescription}). Should be a 2-letter country code.`,
      ),
    region: z
      .string()
      .optional()
      .describe(`Region filter (${commonFilterDescription})`),
    city: z
      .string()
      .optional()
      .describe(`City filter (${commonFilterDescription})`),
    browser: z
      .string()
      .optional()
      .describe(`Browser filter (${commonFilterDescription})`),
    device: z
      .string()
      .optional()
      .describe(`Device type filter (${commonFilterDescription})`),
    referrer: z
      .string()
      .optional()
      .describe(`Referrer hostname filter (${commonFilterDescription})`),
    campaign: z
      .string()
      .optional()
      .describe(`UTM campaign filter (${commonFilterDescription})`),
    source: z
      .string()
      .optional()
      .describe(`UTM source filter (${commonFilterDescription})`),
    medium: z
      .string()
      .optional()
      .describe(`UTM medium filter (${commonFilterDescription})`),
    content: z
      .string()
      .optional()
      .describe(`UTM content filter (${commonFilterDescription})`),
    term: z
      .string()
      .optional()
      .describe(`UTM term filter (${commonFilterDescription})`),
    os: z
      .string()
      .optional()
      .describe(`Operating system filter (${commonFilterDescription})`),
    tag: z
      .string()
      .optional()
      .describe(`Tag filter (${commonFilterDescription})`),
    field: z
      .string()
      .optional()
      .describe(`Custom event field-value filter (${commonFilterDescription})`),
  })
  .catchall(
    z
      .string()
      .describe(
        "Dynamic custom-event field filter using key format 'fields-{fieldName}' and Seline filter syntax.",
      ),
  )
  .refine(
    (obj) => {
      const extraKeys = Object.keys(obj).filter(
        (k) => !FILTER_KEYS.includes(k),
      );
      return extraKeys.every((k) => k.startsWith("fields-"));
    },
    { message: "Additional properties must start with 'fields-'" },
  )
  .optional();

const dateObj = z.object({
  period: z
    .enum(PERIOD)
    .optional()
    .describe("Preset date period. Use either 'period' or a custom 'range'."),
  range: z
    .object({
      from: z.string().describe("Range start datetime in ISO 8601 format."),
      to: z.string().describe("Range end datetime in ISO 8601 format."),
    })
    .describe("Custom date range object with required 'from' and 'to'.")
    .optional(),
  interval: z
    .enum(INTERVAL)
    .optional()
    .describe("Grouping interval for time-series responses."),
  filters: filter.describe(
    "Optional analytics filters. Supports predefined keys and dynamic 'fields-*' keys.",
  ),
});

function getApiKey() {
  const k = process.argv[2];
  if (k) return k;
  throw new Error("Missing Seline API key. Usage: seline-mcp <SELINE_API_KEY>");
}

async function post(path, body) {
  const k = getApiKey();
  const b = "https://api.seline.com";
  const url = new URL(
    path.replace(/^\//, ""),
    b.endsWith("/") ? b : `${b}/`,
  ).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${k}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new Error(
      `Selene API error ${res.status}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
  }

  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function registerTools(server) {
  server.registerTool(
    "seline_get_data",
    {
      description:
        "Get unique visitors and page views over time with optional interval grouping, date filtering, and analytics filters (POST /api/v1/data).",
      inputSchema: dateObj.refine((v) => v.period || v.range, {
        message: "Either 'period' or 'range' must be provided",
      }),
    },
    async (args) => {
      const res = await post("/api/v1/data", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_charges",
    {
      description:
        "Get charges and revenue over time with optional interval grouping, date filtering, and analytics filters (POST /api/v1/charges).",
      inputSchema: dateObj.refine((v) => v.period || v.range, {
        message: "Either 'period' or 'range' must be provided",
      }),
    },
    async (args) => {
      const res = await post("/api/v1/charges", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_visit_metrics",
    {
      description:
        "Get visit quality metrics including visits, page views, average session duration, and bounce rate for the selected period and filters (POST /api/v1/visit-metrics).",
      inputSchema: dateObj.refine((v) => v.period || v.range, {
        message: "Either 'period' or 'range' must be provided",
      }),
    },
    async (args) => {
      const res = await post("/api/v1/visit-metrics", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_custom_events",
    {
      description:
        "Get aggregated custom events and charge events with pagination, optional search, type filtering, date range, and analytics filters (POST /api/v1/custom-events).",
      inputSchema: dateObj
        .extend({
          page: z
            .number()
            .int()
            .min(1)
            .default(1)
            .describe("Page number for pagination (default: 1)."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .default(10)
            .describe("Number of rows per page (default: 10, max: 1000)."),
          search: z
            .string()
            .optional()
            .describe("Search term for event names."),
          types: z
            .array(z.enum(["custom", "charge"]))
            .optional()
            .describe("Event types to include: custom, charge, or both."),
        })
        .refine((v) => v.period || v.range, {
          message: "Either 'period' or 'range' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/custom-events", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  const TOP_TYPES = [
    "country",
    "region",
    "city",
    "browser",
    "device",
    "os",
    "referrer",
    "campaign",
    "source",
    "medium",
    "content",
    "term",
  ];

  server.registerTool(
    "seline_get_top_visitors",
    {
      description:
        "Get top visitor dimensions (country, browser, referrer, UTM, device, OS, etc.) with counts, pagination, and optional search (POST /api/v1/stats).",
      inputSchema: dateObj
        .extend({
          type: z.enum(TOP_TYPES).describe("Dimension to group visitors by."),
          page: z
            .number()
            .int()
            .min(1)
            .default(1)
            .describe("Page number for pagination (default: 1)."),
          limit: z
            .number()
            .int()
            .min(1)
            .default(10)
            .describe("Number of rows per page (default: 10)."),
          search: z
            .string()
            .optional()
            .describe("Search term for dimension values."),
        })
        .refine((v) => v.period || v.range, {
          message: "Either 'period' or 'range' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/stats", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_exit_pages",
    {
      description:
        "Get the most common exit pages from multi-page sessions (where users drop off). Excludes bounces to show where engaged users tend to leave (POST /api/v1/exit-pages).",
      inputSchema: dateObj
        .extend({
          page: z
            .number()
            .int()
            .min(1)
            .default(1)
            .describe("Page number for pagination (default: 1)."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .default(100)
            .describe("Number of rows per page (default: 100, max: 1000)."),
          search: z.string().optional().describe("Search term for page paths."),
        })
        .refine((v) => v.period || v.range, {
          message: "Either 'period' or 'range' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/exit-pages", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  const PROPERTIES = [
    "page_pathname",
    "visitor_referrer",
    "visitor_campaign",
    "visitor_source",
    "visitor_medium",
    "visitor_content",
    "visitor_term",
    "visitor_country",
    "visitor_browser",
    "visitor_os",
    "hostname",
    "event_name",
  ];

  server.registerTool(
    "seline_get_property_values",
    {
      description:
        "Get distinct values for a specific event property with search and pagination. Can be used to find project pathnames, event names, referrers, UTMs, countries, etc. (POST /api/v1/property-values).",
      inputSchema: z.object({
        property: z
          .enum(PROPERTIES)
          .describe("The event property to get distinct values for."),
        search: z.string().optional().describe("Search term to filter values."),
        page: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe("Page number for pagination (default: 1)."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(100)
          .describe("Number of rows per page (default: 100, max: 1000)."),
      }),
    },
    async (args) => {
      const res = await post("/api/v1/property-values", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_event_data",
    {
      description:
        "Get all custom field keys and the top 100 used values for each, for a specific custom event. Useful for discovering what data is attached to an event (POST /api/v1/event-data).",
      inputSchema: z
        .object({
          event: z.string().describe("Custom event name to analyze."),
          period: z
            .enum(PERIOD)
            .optional()
            .describe(
              "Preset date period. Use either 'period' or a custom 'range'.",
            ),
          range: z
            .object({
              from: z
                .string()
                .describe("Range start datetime in ISO 8601 format."),
              to: z.string().describe("Range end datetime in ISO 8601 format."),
            })
            .optional()
            .describe(
              "Custom date range object with required 'from' and 'to'.",
            ),
        })
        .refine((v) => v.period || v.range, {
          message: "Either 'period' or 'range' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/event-data", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_field_values",
    {
      description:
        "Get possible values for a specific custom event field, with pagination and search. Use 'seline_get_event_data' first to discover available fields (POST /api/v1/field-values).",
      inputSchema: z
        .object({
          event: z.string().describe("Custom event name."),
          field: z.string().describe("Custom event field (data key)."),
          period: z
            .enum(PERIOD)
            .optional()
            .describe(
              "Preset date period. Use either 'period' or a custom 'range'.",
            ),
          range: z
            .object({
              from: z
                .string()
                .describe("Range start datetime in ISO 8601 format."),
              to: z.string().describe("Range end datetime in ISO 8601 format."),
            })
            .optional()
            .describe(
              "Custom date range object with required 'from' and 'to'.",
            ),
          page: z
            .number()
            .int()
            .min(1)
            .default(1)
            .describe("Page number for pagination (default: 1)."),
          search: z
            .string()
            .optional()
            .describe("Search term to filter values."),
        })
        .refine((v) => v.period || v.range, {
          message: "Either 'period' or 'range' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/field-values", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_events",
    {
      description:
        "Get raw events with full filtering capabilities, event type filtering, pagination, search, and ordering. Useful for exporting transactions, computing average order value, or building custom reports (POST /api/v1/events).",
      inputSchema: dateObj
        .extend({
          eventTypes: z
            .array(z.enum(["page-view", "custom", "charge"]))
            .optional()
            .describe("Filter by specific event types."),
          page: z
            .number()
            .int()
            .min(1)
            .default(1)
            .describe("Page number for pagination (default: 1)."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .default(100)
            .describe("Number of rows per page (default: 100, max: 1000)."),
          search: z
            .string()
            .optional()
            .describe("Search term for event names or page paths."),
          orderBy: z
            .enum(["timestamp", "event_name", "visitor_id"])
            .optional()
            .describe("Field to order by (default: timestamp)."),
          orderDirection: z
            .enum(["ASC", "DESC"])
            .optional()
            .describe("Order direction (default: DESC)."),
        })
        .refine((v) => v.period || v.range, {
          message: "Either 'period' or 'range' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/events", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  const funnelFilters = z
    .array(
      z.object({
        field: z
          .string()
          .describe(
            "Funnel filter field: hostname, country, browser, device, referrer, campaign, source, medium, content, term, os.",
          ),
        value: z.string().describe("Filter value."),
      }),
    )
    .optional()
    .describe("Optional funnel filters as an array of field/value pairs.");

  server.registerTool(
    "seline_get_funnel",
    {
      description:
        "Analyze a conversion funnel through multiple steps (pages or events). Calculates how well specific pages and events convert users through the defined flow and returns the trend vs the previous period (POST /api/v1/funnel).",
      inputSchema: z
        .object({
          period: z
            .enum(PERIOD)
            .optional()
            .describe(
              "Preset date period. Use either 'period' or a custom 'range'.",
            ),
          range: z
            .object({
              from: z
                .string()
                .describe("Range start datetime in ISO 8601 format."),
              to: z.string().describe("Range end datetime in ISO 8601 format."),
            })
            .optional()
            .describe(
              "Custom date range object with required 'from' and 'to'.",
            ),
          steps: z
            .array(
              z.object({
                name: z
                  .string()
                  .describe(
                    "Step name. Page path like '/blog/abc' (use * for wildcard, e.g. '/blog/*') or custom event name.",
                  ),
                type: z
                  .enum(["page-view", "custom"])
                  .describe(
                    "Whether this step is a page view or a custom event.",
                  ),
              }),
            )
            .min(2)
            .describe(
              "Array of funnel steps in order. Must have at least 2 steps.",
            ),
          filters: funnelFilters,
        })
        .refine((v) => v.period || v.range, {
          message: "Either 'period' or 'range' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/funnel", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_visitor",
    {
      description:
        "Find a visitor by their shortId (Dashboard URL id) or internal visitorId (UUID). At least one of the two is required (POST /api/v1/visitor).",
      inputSchema: z
        .object({
          shortId: z
            .string()
            .optional()
            .describe("Visitor's shortId, e.g. 'kxw18m'."),
          visitorId: z
            .string()
            .optional()
            .describe("Visitor's internal id (UUID)."),
        })
        .refine((v) => v.shortId || v.visitorId, {
          message: "Either 'shortId' or 'visitorId' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/visitor", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_visitor_events",
    {
      description:
        "Get all events for a specific visitor. Use after finding a visitor to analyze their behavior over time (POST /api/v1/visitor-events).",
      inputSchema: z.object({
        visitorId: z.string().describe("Visitor's internal id (UUID)."),
        period: z
          .enum(PERIOD)
          .optional()
          .describe(
            "Preset date period. Use either 'period' or a custom 'range'.",
          ),
        range: z
          .object({
            from: z
              .string()
              .describe("Range start datetime in ISO 8601 format."),
            to: z.string().describe("Range end datetime in ISO 8601 format."),
          })
          .optional()
          .describe("Custom date range object with required 'from' and 'to'."),
        page: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe("Page number for pagination (default: 1)."),
        perPage: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(1000)
          .describe("Number of events per page (default: 1000, max: 1000)."),
      }),
    },
    async (args) => {
      const res = await post("/api/v1/visitor-events", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_visitor_insight",
    {
      description:
        "Generate AI-powered insights about a visitor's behavior based on their events. Returns a structured insight with main finding, details, bullet points, and recommendations (POST /api/v1/visitor-insight).",
      inputSchema: z.object({
        shortId: z
          .string()
          .describe("Visitor's shortId to generate insight for."),
        context: z
          .string()
          .optional()
          .describe(
            "Additional context or a specific question about the visitor's behavior.",
          ),
      }),
    },
    async (args) => {
      const res = await post("/api/v1/visitor-insight", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  server.registerTool(
    "seline_get_most_active_visitors",
    {
      description:
        "Get the most active visitors ranked by event count within a given time period. Shows who has generated the most events (page views, custom events, etc.) during the date range (POST /api/v1/most-active-visitors).",
      inputSchema: dateObj
        .extend({
          page: z
            .number()
            .int()
            .min(1)
            .default(1)
            .describe("Page number for pagination (default: 1)."),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10)
            .describe(
              "Number of top visitors to return (default: 10, max: 100).",
            ),
          eventType: z
            .enum(["custom", "pageview"])
            .optional()
            .describe("Filter by activity type."),
          browser: z
            .array(z.string())
            .optional()
            .describe("Filter by specific browsers."),
          device: z
            .array(z.string())
            .optional()
            .describe("Filter by specific devices."),
          operatingSystem: z
            .array(z.string())
            .optional()
            .describe("Filter by specific operating systems."),
        })
        .refine((v) => v.period || v.range, {
          message: "Either 'period' or 'range' must be provided",
        }),
    },
    async (args) => {
      const res = await post("/api/v1/most-active-visitors", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  const VISITOR_FILTER_KEYS = [
    "pageview",
    "event",
    "country",
    "browser",
    "device",
    "os",
    "referrer",
    "campaign",
    "source",
    "medium",
    "content",
    "term",
    "firstSeen",
    "lastActivity",
    "users",
    "tag",
    "funnel",
  ];

  const visitorFilter = z
    .object({
      pageview: z
        .string()
        .optional()
        .describe(`Page pathname filter (${commonFilterDescription})`),
      event: z
        .string()
        .optional()
        .describe(`Custom event filter (${commonFilterDescription})`),
      country: z
        .string()
        .optional()
        .describe(
          `Country filter (${commonFilterDescription}). Should be a 2-letter country code.`,
        ),
      browser: z
        .string()
        .optional()
        .describe(`Browser filter (${commonFilterDescription})`),
      device: z
        .string()
        .optional()
        .describe(`Device type filter (${commonFilterDescription})`),
      os: z
        .string()
        .optional()
        .describe(`Operating system filter (${commonFilterDescription})`),
      referrer: z
        .string()
        .optional()
        .describe(`Referrer hostname filter (${commonFilterDescription})`),
      campaign: z
        .string()
        .optional()
        .describe(`UTM campaign filter (${commonFilterDescription})`),
      source: z
        .string()
        .optional()
        .describe(`UTM source filter (${commonFilterDescription})`),
      medium: z
        .string()
        .optional()
        .describe(`UTM medium filter (${commonFilterDescription})`),
      content: z
        .string()
        .optional()
        .describe(`UTM content filter (${commonFilterDescription})`),
      term: z
        .string()
        .optional()
        .describe(`UTM term filter (${commonFilterDescription})`),
      firstSeen: z
        .string()
        .optional()
        .describe(`First seen date filter (${commonFilterDescription})`),
      lastActivity: z
        .string()
        .optional()
        .describe(`Last activity date filter (${commonFilterDescription})`),
      users: z
        .string()
        .optional()
        .describe(
          `Users filter, e.g. 'is:known' or 'is:anonymous' (${commonFilterDescription})`,
        ),
      tag: z
        .string()
        .optional()
        .describe(`Tag filter (${commonFilterDescription})`),
      funnel: z
        .string()
        .optional()
        .describe("Funnel filter in '{funnelId}:{stepIndex}' format."),
    })
    .catchall(
      z
        .string()
        .describe(
          "Dynamic custom-event field filter using key format 'fields-{fieldName}'.",
        ),
    )
    .refine(
      (obj) => {
        const extraKeys = Object.keys(obj).filter(
          (k) => !VISITOR_FILTER_KEYS.includes(k),
        );
        return extraKeys.every((k) => k.startsWith("fields-"));
      },
      { message: "Additional properties must start with 'fields-'" },
    )
    .optional();

  server.registerTool(
    "seline_get_visitors",
    {
      description:
        "Get a paginated list of visitors with comprehensive filtering options. Use this to find specific visitors, analyze visitor segments, or pull visitor profiles by various criteria (POST /api/v1/visitors).",
      inputSchema: z.object({
        page: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe("Page number for pagination (default: 1)."),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(10)
          .describe("Number of visitors per page (default: 10, max: 100)."),
        search: z
          .string()
          .optional()
          .describe("Search term to find visitors by name."),
        skipCounts: z
          .boolean()
          .optional()
          .describe("Skip counting total visitors for a faster response."),
        filters: visitorFilter.describe(
          "Optional visitor filters. Supports the keys listed above plus dynamic 'fields-*' keys.",
        ),
      }),
    },
    async (args) => {
      const res = await post("/api/v1/visitors", args);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );
}

function createMcp() {
  const server = new McpServer({
    name: "seline-analytics-mcp",
    version: "1.0.0",
  });
  registerTools(server);
  return server;
}

async function runStdio() {
  getApiKey();
  const transport = new StdioServerTransport();
  await createMcp().connect(transport);
}

runStdio().catch((err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});
