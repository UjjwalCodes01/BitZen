#!/bin/bash
# Start backend with IPv4 DNS priority
export NODE_OPTIONS="--dns-result-order=ipv4first"
npx nodemon src/server.ts
