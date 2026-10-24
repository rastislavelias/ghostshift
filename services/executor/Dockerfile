FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS dependencies
WORKDIR /dependencies
COPY examples/playground/package.json examples/playground/package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
RUN apk add --no-cache python3 iptables && addgroup -S -g 1001 sandbox && adduser -S -u 1001 -G sandbox sandbox
COPY --from=dependencies /dependencies /dependencies
COPY examples/playground /template
COPY services/executor/server.py services/executor/launch.py /supervisor/
CMD ["python3", "-u", "/supervisor/server.py"]
