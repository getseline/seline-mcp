# @seline-analytics/mcp

Local MCP server for Seline Analytics.

It runs over stdio and sends tool requests to the Seline API using one startup arg: your Seline API key.

## Install

```bash
npm i -g @seline-analytics/mcp
```

## Run

```bash
seline-mcp sln_your_api_key
```

## Cursor setup

```json
{
  "mcpServers": {
    "seline": {
      "command": "npx",
      "args": ["-y", "@seline-analytics/mcp", "sln_your_api_key"]
    }
  }
}
```

Then restart Cursor so it reconnects MCP servers.

## Claude Code setup

Run this command:

```bash
claude mcp add seline -- npx -y @seline-analytics/mcp sln_your_api_key
```

Then restart Claude Code.

## Codex setup

If your Codex client uses `mcpServers` JSON config, add:

```json
{
  "mcpServers": {
    "seline": {
      "command": "npx",
      "args": ["-y", "@seline-analytics/mcp", "sln_your_api_key"]
    }
  }
}
```

Then restart Codex and confirm the `seline_*` tools appear.

## Tools

- `seline_get_data` -> `POST /api/v1/data`
- `seline_get_charges` -> `POST /api/v1/charges`
- `seline_get_visit_metrics` -> `POST /api/v1/visit-metrics`
- `seline_get_custom_events` -> `POST /api/v1/custom-events`
- `seline_get_top_visitors` -> `POST /api/v1/stats`
