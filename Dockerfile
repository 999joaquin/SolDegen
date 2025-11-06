# ---------- Build stage ----------
FROM node:22-bookworm AS build
WORKDIR /app

# Build-time env so Next.js can prerender without crashing
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_BASE=/
ARG NEXT_PUBLIC_PHYSICS_SERVER_URL=/physics
ARG NEXT_PUBLIC_SOLANA_NETWORK
ARG NEXT_PUBLIC_SOLANA_RPC_URL

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
ENV NEXT_PUBLIC_PHYSICS_SERVER_URL=${NEXT_PUBLIC_PHYSICS_SERVER_URL}
ENV NEXT_PUBLIC_SOLANA_NETWORK=${NEXT_PUBLIC_SOLANA_NETWORK}
ENV NEXT_PUBLIC_SOLANA_RPC_URL=${NEXT_PUBLIC_SOLANA_RPC_URL}

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

# ---------- Runtime stage ----------
FROM node:22-bookworm

# Python + venv for the physics backend
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Python virtualenv
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
ENV PYTHON_BIN="${VIRTUAL_ENV}/bin/python"

# --- Copy app artifacts from the build stage ---
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/server.js ./
COPY --from=build /app/python-backend ./python-backend
# bring pruned prod node_modules so server.js can require socket.io/http-proxy
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Install Python deps (if any) into the venv
RUN if [ -f python-backend/requirements.txt ]; then pip install -r python-backend/requirements.txt; fi

EXPOSE 3000
CMD ["node", "server.js"]
