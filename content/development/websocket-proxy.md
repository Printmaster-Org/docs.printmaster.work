---
title: "WebSocket HTTP Proxy Feature"
source: "docs/dev/WEBSOCKET_PROXY.md"
sourceCommit: "565f4c0762e467f083f54a9e0e7f6bc23ada56c3"
---

## Overview

The PrintMaster system now supports proxying HTTP requests through the WebSocket connection between agents and the server. This allows you to access:
- Agent web UIs from anywhere (even behind NAT/firewalls)
- Device web UIs (printer admin pages) through the agent's network connection

Transport/HTTPS claims below were checked against source snapshot `565f4c0`; this is not a full protocol audit. Default standalone server access is `https://localhost:9443`. HTTP `9090` is the backend when `BEHIND_PROXY=true` and `PROXY_USE_HTTPS=false`, not the agent's HTTP `8080` port.

## Architecture

```
Browser → Server → WebSocket → Agent → Target (Agent UI or Device)
        ←         ←            ←       ←
```

### Flow

1. **User clicks "Open UI" button** in the server web interface
2. **Browser makes HTTP request** to server proxy endpoint
3. **Server converts HTTP request** to WebSocket message (`proxy_request`)
4. **Server sends message** through WebSocket to connected agent
5. **Agent receives proxy request** and invokes its registered local HTTP handler; device requests then use the agent's device proxy, which supports HTTP and HTTPS targets
6. **Agent sends HTTP response** back through WebSocket (`proxy_response`)
7. **Server forwards response** to browser

## WebSocket Protocol

### Message Types

#### `proxy_request` (Server → Agent)
```json
{
  "type": "proxy_request",
  "data": {
    "request_id": "unique-id",
    "url": "http://localhost:8080/",
    "method": "GET",
    "headers": {
      "User-Agent": "...",
      "Accept": "..."
    },
    "body": "base64-encoded-body"
  },
  "timestamp": "2025-11-07T12:00:00Z"
}
```

#### `proxy_response` (Agent → Server)
```json
{
  "type": "proxy_response",
  "data": {
    "request_id": "unique-id",
    "status_code": 200,
    "headers": {
      "Content-Type": "text/html",
      "Content-Length": "1234"
    },
    "body": "base64-encoded-response-body"
  },
  "timestamp": "2025-11-07T12:00:01Z"
}
```

## API Endpoints

### Agent UI Proxy
```
GET /api/v1/proxy/agent/{agentID}/{path...}
```

Uses a logical `http://localhost:8080` target to invoke the agent's registered local handler directly. It does not require a network round-trip to a listener on port `8080`.

**Example:**
```
GET /api/v1/proxy/agent/my-agent-id/
GET /api/v1/proxy/agent/my-agent-id/api/devices
```

### Device UI Proxy
```
GET /api/v1/proxy/device/{serialNumber}/{path...}
```

Proxies HTTP requests to a device's web UI through its associated agent.

The server routes through the agent's `/proxy/{serial}` handler. That handler can use a detected HTTP or HTTPS device URL and has HTTPS fallback behavior. Printer compatibility still depends on redirects, authentication, and vendor-specific content rewriting.

**Example:**
```
GET /api/v1/proxy/device/ABC123/
GET /api/v1/proxy/device/ABC123/web/index.html
```

## UI Features

### Agent Cards
Each agent card now has an **"Open UI"** button that:
- Opens the agent's web interface in a new window
- Is disabled if the agent is not connected via WebSocket
- Shows a tooltip explaining why it's disabled

### Agent Details Modal
The agent details view includes an **"Open Agent UI"** button with the same functionality.

### Device Cards
Each device card now has an **"Open Web UI"** button that:
- Opens the device's admin interface in a new window
- Is disabled if the device has no IP or no associated agent
- Requires the agent to be connected via WebSocket

## Implementation Details

### Server-Side (`server/`)

**Files Modified:**
- `websocket.go` - Added proxy message handling and request/response tracking
- `main.go` - Added proxy endpoint handlers

**Key Functions:**
- `handleAgentProxy()` - Proxies requests to agent UIs
- `handleDeviceProxy()` - Proxies requests to device UIs
- `proxyThroughWebSocket()` - Core proxy logic
- `sendProxyRequest()` - Sends proxy request via WebSocket
- `handleWSProxyResponse()` - Handles proxy responses from agents

### Agent-Side (`agent/agent/`)

**Files Modified:**
- `ws_client.go` - Added proxy request handling

**Key Functions:**
- `handleProxyRequest()` - Receives proxy request, makes HTTP call, sends response
- `sendProxyResponse()` - Sends successful HTTP response
- `sendProxyError()` - Sends error response

### Web UI (`server/web/`)

**Files Modified:**
- `app.js` - Added proxy buttons and JavaScript functions

**Key Functions:**
- `openAgentUI(agentId)` - Opens proxied agent UI
- `openDeviceUI(serialNumber)` - Opens proxied device UI

## Security Considerations

1. **Authentication**: The proxy endpoints currently inherit authentication from the server's session handling
2. **Agent Validation**: Only connected agents can be proxied through
3. **Request Timeouts**: Proxy requests have a 30-second timeout to prevent hanging connections
4. **Header Filtering**: Hop-by-hop headers are filtered to prevent protocol issues

5. **Encryption**: `https://` server URLs become `wss://`; `http://` URLs become unencrypted `ws://`. Use HTTPS/WSS and a trusted server certificate in production. At this snapshot the WebSocket dialer receives a skip-verification flag, but not the custom CA pool configured for HTTP uploads; `ca_path` alone does not establish WSS trust.
6. **Device TLS caveat**: The agent's device proxy supports HTTPS, including self-signed printer certificates, but skips certificate verification on those device connections. HTTPS support is not a guarantee of authenticated printer identity or end-to-end certificate validation.

## Limitations

1. **WebSocket Required**: Proxy only works when agent has active WebSocket connection
2. **Timeout**: Ordinary requests default to 30 seconds; some agent operations use custom timeouts
3. **Binary Content**: All content is base64-encoded, adding ~33% overhead
4. **Device Compatibility**: HTTP and HTTPS targets are supported; vendor UIs may still need proxy-specific rewriting or authentication handling
5. **Buffering**: Ordinary responses are buffered. Selected streaming paths use a separate streaming implementation; this is not a general-purpose transparent tunnel

## Future Enhancements

Potential improvements beyond the existing HTTP/HTTPS target and selected streaming support:

1. **Broader Streaming Support**: Extend selected streaming paths to more response types
2. **WebSocket Upgrade**: Support WebSocket connections through the proxy
3. **Compression**: Add gzip compression for text content
4. **Caching**: Cache static assets to reduce proxy traffic
5. **Port Configuration**: Remove remaining assumptions about the logical localhost target; agent UI requests already use direct handler invocation
6. **SSL/TLS Verification**: Improve printer certificate validation; HTTPS device connections already exist
7. **Connection Pooling**: Reuse HTTP connections to improve performance

## Testing

To test the proxy feature:

1. **Start the server**: `./printmaster-server`
2. **Start an agent** with WebSocket enabled: `./printmaster-agent --config config.toml`
3. **Open the server web UI**: `https://localhost:9443` by default; use your proxy's public HTTPS URL for a proxied deployment
4. **Navigate to Agents tab**
5. **Click "Open UI"** on an active agent - should open agent's UI in new window
6. **Navigate to Devices tab**
7. **Click "Open Web UI"** on a device - should open device's admin page

## Troubleshooting

### Button is Disabled
- **Agent UI**: Check that agent status is "active" (WebSocket connected)
- **Device UI**: Check that device has an IP address and associated agent

### "Agent not connected via WebSocket"
- Verify server mode is enabled, its URL is correct, and agent onboarding/approval is complete; `use_websocket` is not an `AgentConfig` TOML field
- Check server logs for WebSocket connection status
- Verify network connectivity between agent and server

### "Proxy request timeout"
- Device may be offline or unreachable from agent
- Target service may be slow to respond
- Check agent logs for HTTP request errors

### Blank Page or Error
- Check browser console for errors
- Verify target service is running (agent UI or device web server)
- Check agent logs for proxy request handling

## Performance Notes

- **Latency**: Adds ~50-100ms overhead compared to direct access
- **Throughput**: Limited by WebSocket connection (~10-20 MB/s typical)
- **Concurrent Requests**: Multiple requests can be in-flight simultaneously
- **Memory**: Ordinary responses are buffered; selected streaming paths behave differently

For large file downloads or high-throughput needs, consider direct access when possible.

