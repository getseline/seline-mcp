<h1>Seline MCP</h1>
&nbsp;
<div>
  <a href="https://seline.com">
    <img width="500" src="https://images.seline.com/seline-boxes.png" alt="Seline" />
  </a>
</div>
&nbsp;
<div>
  <a href="https://seline.com"><strong>Seline</strong></a> is a cookieless, lightweight and independent analytics platform designed with privacy in mind. Get insights about your website and product usage without compromising user privacy.
</div>
&nbsp;

[![Seline MCP server](https://glama.ai/mcp/servers/getseline/seline-mcp/badges/card.svg)](https://glama.ai/mcp/servers/getseline/seline-mcp)

Seline MCP runs over stdio and sends tool requests to the [Seline public API](https://seline.com/api/overview) using your API key (Settings → Integrations).

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