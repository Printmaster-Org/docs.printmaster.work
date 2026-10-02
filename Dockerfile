FROM alpine:3.22 AS build
ARG HUGO_VERSION=0.150.1
ARG BASE_URL=https://docs.printmaster.work/
RUN apk add --no-cache ca-certificates wget \
    && case "$(uname -m)" in x86_64) arch=amd64 ;; aarch64) arch=arm64 ;; *) exit 1 ;; esac \
    && archive="hugo_${HUGO_VERSION}_linux-${arch}.tar.gz" \
    && release="https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}" \
    && wget -q "${release}/${archive}" "${release}/hugo_${HUGO_VERSION}_checksums.txt" \
    && awk -v file="$archive" '$2 == file {print; found=1} END {if (!found) exit 1}' "hugo_${HUGO_VERSION}_checksums.txt" | sha256sum -c - \
    && tar -xzf "$archive" -C /usr/local/bin hugo \
    && rm "$archive" "hugo_${HUGO_VERSION}_checksums.txt"
WORKDIR /site
COPY hugo.toml ./
COPY content ./content
COPY assets ./assets
COPY layouts ./layouts
COPY static ./static
RUN hugo --gc --minify --panicOnWarning --baseURL "$BASE_URL"

FROM scratch AS artifact
COPY --from=build /site/public /

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
LABEL org.opencontainers.image.title="PrintMaster Docs" \
      org.opencontainers.image.source="https://github.com/Printmaster-Org/docs.printmaster.work" \
      org.opencontainers.image.licenses="MIT"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/public /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1