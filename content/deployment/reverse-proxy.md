---
title: "Reverse proxy setup"
description: "Configure Nginx, Nginx Proxy Manager, Caddy, Traefik, Apache, HAProxy, or IIS in front of PrintMaster Server."
weight: 5
---

Use a reverse proxy when you want a stable HTTPS hostname for the PrintMaster Server, centralized certificate management, or access controls at the network edge. This guide covers the **Server** web application and Agent connections. It does not configure the Agent's local web interface.

For a new deployment, start with [Docker deployment](/deployment/docker/) or [Unraid deployment](/deployment/unraid/), then return here for the proxy. Use a dedicated hostname such as `printmaster.example.com`; serve PrintMaster at `/` on that host rather than rewriting it beneath a URL path prefix.

## Choose the upstream connection

The proxy accepts public HTTPS connections. Choose how it connects to the Server:

| Mode | Server settings | Proxy upstream | Use when |
| --- | --- | --- | --- |
| TLS terminates at the proxy (recommended for most deployments) | `BEHIND_PROXY=true`, `PROXY_USE_HTTPS=false` | HTTP on `9090` | The proxy and Server share a trusted host or private container network. |
| TLS from proxy to Server too | `BEHIND_PROXY=true`, `PROXY_USE_HTTPS=true` | HTTPS on `9443` | Traffic crosses a network you do not trust, or policy requires encryption on both hops. Configure the proxy to trust the Server's certificate. |

The standalone Server default is HTTPS on `9443`. HTTP on `9090` is available only in proxy mode. The **public URL** remains `https://printmaster.example.com` in either mode, and Agents must use that public HTTPS URL so their connection uses WSS.

## Configure the Server

Set these Server environment variables for TLS termination at the proxy:

```yaml
environment:
  BEHIND_PROXY: "true"
  PROXY_USE_HTTPS: "false"
  BIND_ADDRESS: "0.0.0.0"
```

`SERVER_HTTP_PORT` defaults to `9090`; set it only if you changed the port. The Server must receive the original `Host` header and `X-Forwarded-Proto: https`. The proxy must forward WebSocket upgrades and keep long-lived connections open.

Keep the backend private. If the proxy runs on the Docker host, publish only to loopback:

```yaml
ports:
  - "127.0.0.1:9090:9090"
```

If the proxy is another container, attach both containers to a private Docker network, route to the Server service name on port `9090`, and omit the Server's `ports` entry. Do not expose port `9090` directly to the internet.

### Trusted client addresses

PrintMaster only uses `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`, or `True-Client-IP` for client-address logging and rate limiting when the direct TCP peer is trusted. The default trusted ranges are private networks and loopback. `TRUSTED_PROXIES` replaces those defaults; set it to the proxy's exact IP or narrow CIDR when you have a stable address. It accepts comma-separated IPs/CIDRs or a JSON array. For example:

```yaml
environment:
  TRUSTED_PROXIES: "172.20.0.2"
```

Do not trust a whole network unless every host on it is under your control. Configure the edge proxy to **replace** incoming forwarded headers with values it derives itself. PrintMaster currently selects the first valid address in `X-Forwarded-For` when the direct peer is trusted, so blindly appending a client-supplied value can spoof the address used for logging and rate limiting. Restrict direct access to the backend so clients cannot bypass the proxy or send their own `X-Forwarded-Proto` value.

## Proxy requirements

Whichever product you use, configure it to:

- Terminate public TLS with a certificate valid for the hostname and serve the full certificate chain.
- Preserve the original `Host` header and set `X-Forwarded-Proto` to `https` for HTTPS requests.
- Pass WebSocket `Upgrade` and `Connection` headers. HTTP/1.1 to the backend is the most compatible setting.
- Allow long-lived WebSocket connections; avoid short idle/read timeouts. WebSockets carry Agent connections and real-time UI updates.
- Preserve request paths and query strings. Do not strip or rewrite the root path.
- Restrict the backend listener to the proxy, and apply authentication or network policy at the edge only when it does not block Agent API and WebSocket traffic.

The examples assume TLS is configured at the proxy and the Server listens on HTTP `9090`. Replace the hostname and upstream address with your values.

## Nginx

Place the `map` in the Nginx `http` context, not inside a `server` block. In the HTTPS virtual host:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    server_name printmaster.example.com;

    ssl_certificate     /etc/ssl/certs/printmaster-fullchain.pem;
    ssl_certificate_key /etc/ssl/private/printmaster.key;

    location / {
        proxy_pass http://127.0.0.1:9090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
}
```

If another trusted load balancer sits in front of Nginx, configure Nginx's real-IP handling for that load balancer before using `$remote_addr`; trust only its published address ranges. Do not copy broad `set_real_ip_from` ranges from examples without verifying them.

## Nginx Proxy Manager

Create a **Proxy Host**:

1. Set **Domain Names** to `printmaster.example.com`.
2. Set **Scheme** to `http`, **Forward Hostname / IP** to the Server's reachable address or Docker service name, and **Forward Port** to `9090`.
3. Enable **Websockets Support**.
4. On the **SSL** tab, select or request a certificate for the hostname and enable **Force SSL** if all public access should use HTTPS.
5. Save, then verify the proxy container can resolve and reach the upstream.

Set the Server to `BEHIND_PROXY=true` and `PROXY_USE_HTTPS=false`. When Nginx Proxy Manager and PrintMaster share a Docker network, use the service/container DNS name and do not publish `9090` on the host. Otherwise publish it on loopback only. Check NPM's generated `X-Forwarded-For` behavior: configure the public edge to replace client-supplied values with the peer address, not append an untrusted incoming chain. If NPM sits behind another load balancer, trust only that upstream and verify the resulting client address before relying on IP-based rate limits.

## Caddy

Caddy automatically obtains and renews a public certificate when DNS points to the host and ports `80` and `443` are reachable. A minimal Caddyfile is:

```caddyfile
printmaster.example.com {
    reverse_proxy 127.0.0.1:9090
}
```

For a containerized Server on the same Docker network, use its service name instead:

```caddyfile
printmaster.example.com {
    reverse_proxy printmaster-server:9090
}
```

Caddy handles WebSocket upgrades and forwards the host and scheme by default. Keep the upstream network private as described above.

## Traefik

Attach the Server and Traefik to the same private Docker network. This Compose fragment shows the routing labels; keep your existing volumes, database, and other Server settings:

```yaml
services:
  printmaster-server:
    image: ghcr.io/printmaster-org/printmaster-server:latest
    environment:
      BEHIND_PROXY: "true"
      PROXY_USE_HTTPS: "false"
      BIND_ADDRESS: "0.0.0.0"
    networks:
      - proxy
    labels:
      - traefik.enable=true
      - traefik.http.routers.printmaster.rule=Host(`printmaster.example.com`)
      - traefik.http.routers.printmaster.entrypoints=websecure
      - traefik.http.routers.printmaster.tls=true
      - traefik.http.routers.printmaster.tls.certresolver=letsencrypt
      - traefik.http.services.printmaster.loadbalancer.server.port=9090

networks:
  proxy:
    external: true
```

The `websecure` entrypoint and `letsencrypt` resolver must exist in Traefik's static configuration; change the label to match your names, or attach a certificate through your chosen provider. Traefik forwards WebSocket traffic automatically and supplies forwarded headers. If Traefik sits behind another load balancer, configure `forwardedHeaders.trustedIPs` for only that upstream; do not enable insecure forwarded-header trust on a public entrypoint. Verify the final `X-Forwarded-For` chain is sanitized so an untrusted client cannot choose the first address PrintMaster uses. Do not publish the Server port on the host when using the shared network.

## Apache HTTP Server

Enable `mod_proxy`, `mod_proxy_http`, `mod_headers`, and SSL support. Apache 2.4.47 and later can proxy WebSocket upgrades through `mod_proxy_http`:

```apache
<VirtualHost *:443>
    ServerName printmaster.example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/printmaster-fullchain.pem
    SSLCertificateKeyFile /etc/ssl/private/printmaster.key

    ProxyRequests Off
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-For "expr=%{REMOTE_ADDR}"

    ProxyPass        / http://127.0.0.1:9090/ upgrade=websocket
    ProxyPassReverse / http://127.0.0.1:9090/
</VirtualHost>
```

On older Apache versions, enable `mod_proxy_wstunnel` and follow that version's WebSocket upgrade configuration. Keep the Server port reachable only from Apache.

## HAProxy

This example assumes HAProxy terminates TLS and runs in HTTP mode. Add the certificate bundle and backend address for your installation:

```haproxy
defaults
    mode http
    timeout connect 10s
    timeout client  1h
    timeout server  1h
    timeout tunnel  1h

frontend printmaster_https
    bind :443 ssl crt /etc/haproxy/certs/printmaster.pem
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Forwarded-For %[src]
    default_backend printmaster_server

backend printmaster_server
    server printmaster 127.0.0.1:9090 check
```

`set-header` replaces any client-supplied value. For a load balancer in front of HAProxy, configure and trust that hop explicitly rather than blindly forwarding its headers. HAProxy supports WebSocket tunneling in HTTP mode; the tunnel timeout prevents idle WebSocket connections from being closed too soon.

## IIS with ARR and URL Rewrite

On Windows, install **Application Request Routing (ARR)** and **URL Rewrite**, enable the IIS **WebSocket Protocol** feature, and enable proxying in ARR's server-level **Proxy Settings**. Configure an HTTPS binding and certificate for the site. In URL Rewrite's server-level **View Server Variables**, allow `HTTP_X_FORWARDED_PROTO` before using it in a site rule.

A site-level `web.config` rule can forward requests to a Server listening on the same host at port `9090`:

```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="PrintMaster reverse proxy" stopProcessing="true">
          <match url="(.*)" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
            <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
          </serverVariables>
          <action type="Rewrite" url="http://127.0.0.1:9090/{R:1}" appendQueryString="true" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

Preserve the host header in ARR, add both `HTTP_X_FORWARDED_PROTO` and `HTTP_X_FORWARDED_FOR` to the server-level allowed variables, and ensure the client address is set by the trusted IIS proxy rather than accepted from the request. If IIS and the Server run on different machines, replace `127.0.0.1` with a private upstream address and restrict its firewall rule to IIS. Set `BEHIND_PROXY=true` and `PROXY_USE_HTTPS=false` on the Server.

## Encrypted proxy-to-Server connection

For HTTPS on both network hops, configure:

```yaml
environment:
  BEHIND_PROXY: "true"
  PROXY_USE_HTTPS: "true"
```

The proxy upstream is `https://<server-address>:9443`. The Server uses its configured TLS mode and certificate on that listener. Configure the proxy to validate that certificate; do not disable upstream certificate verification as a permanent fix. Use a certificate whose name matches the upstream hostname and whose issuing CA is trusted by the proxy. For a TLS-terminating proxy on the same host or private Docker network, HTTP upstream is simpler, but never expose that HTTP listener to an untrusted network.

## Verify and troubleshoot

1. Open `https://printmaster.example.com` and confirm there is no certificate warning or redirect loop.
2. Confirm the proxy can reach the configured Server listener (`9090` for HTTP or `9443` for HTTPS) from its own network namespace.
3. Sign in, then connect an Agent using the public HTTPS URL. Complete the normal approval/onboarding flow.
4. Confirm the Agent stays connected and real-time status updates work. If the UI loads but Agent status is intermittent, test WebSocket upgrade handling and the proxy's idle timeout.
5. Check Server and proxy logs for upstream connection errors. A `502` usually means the upstream address, port, scheme, or container network is wrong; a WebSocket handshake error usually means upgrade handling or an edge firewall is blocking it.

For Agent connectivity symptoms, see [discovery and connection troubleshooting](/guides/troubleshooting/#discovery-issues). For settings, see [Server configuration](/guides/configuration/).
