FROM node:24.14.0-bookworm

# git and curl ship with the full node:*-bookworm image; corepack activates the
# Yarn version pinned by the repository (packageManager / .yarnrc.yml yarnPath).
RUN corepack enable

USER node
