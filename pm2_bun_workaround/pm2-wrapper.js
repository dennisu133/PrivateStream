#!/usr/bin/env bun
import("../build/index.js").catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
