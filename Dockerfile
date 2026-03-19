## build runner
FROM node:24.14.0-alpine AS build-runner

# Add git and gyp deps
RUN apk add git wget tar g++ make py3-pip

# Set temp directory
WORKDIR /tmp/app

# Move package.json
COPY package.json .
COPY pnpm-lock.yaml .
COPY dynamic-data ./dynamic-data

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install

# Move source files
COPY src ./src
COPY rolldown.config.ts .
COPY tsconfig.json .

# Build project
RUN pnpm run build

# If a WASM bundle was specified, download and extract it
COPY wasm.tar.gz* .
RUN if [ -f wasm.tar.gz ]; then \
  tar -xvzf wasm.tar.gz -C dist; \
fi

## production runner
FROM node:24.14.0-alpine AS prod-runner

# Add git and gyp deps
RUN apk add git g++ make py3-pip

# Set work directory
WORKDIR /app

# Copy package.json from build-runner
COPY --from=build-runner /tmp/app/package.json /app/package.json
COPY --from=build-runner /tmp/app/pnpm-lock.yaml /app/pnpm-lock.yaml

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --only=production

# Move build files
COPY --from=build-runner /tmp/app/dist /app/dist
# COPY --from=golang:1.26.0 /usr/local/go/lib/wasm/wasm_exec.js /app/dist/wasm_exec.js
COPY --from=build-runner /tmp/app/dynamic-data /app/dynamic-data-template

# Start bot
CMD [ "cp", "-r", "dynamic-data-template", "dynamic-data", "&&", "node", "dist/main.js" ]
