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
      .describe(`Country filter (${commonFilterDescription}). Should be a 2-letter country code.`),
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
