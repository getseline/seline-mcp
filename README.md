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

Data over time:

- `seline_get_data` -> `POST /api/v1/data`
- `seline_get_charges` -> `POST /api/v1/charges`

Counts and totals:

- `seline_get_top_visitors` -> `POST /api/v1/stats`
- `seline_get_visit_metrics` -> `POST /api/v1/visit-metrics`
- `seline_get_custom_events` -> `POST /api/v1/custom-events`
- `seline_get_exit_pages` -> `POST /api/v1/exit-pages`

Events and properties:

- `seline_get_events` -> `POST /api/v1/events`
- `seline_get_property_values` -> `POST /api/v1/property-values`
- `seline_get_field_keys` -> `POST /api/v1/event-data`
- `seline_get_field_values` -> `POST /api/v1/field-values`

Funnels:

- `seline_get_funnel` -> `POST /api/v1/funnel`

Visitors:

- `seline_get_visitors` -> `POST /api/v1/visitors`
- `seline_get_visitor` -> `POST /api/v1/visitor`
- `seline_get_visitor_events` -> `POST /api/v1/visitor-events`
- `seline_get_most_active_visitors` -> `POST /api/v1/most-active-visitors`
- `seline_get_visitor_insight` -> `POST /api/v1/visitor-insight`
