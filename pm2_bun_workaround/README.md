# Bugged behavior when using Sveltekit + bun + pm2

Currently (08.11.2025) there is a bug when running bun with pm2. 

PM2's Bun integration (ProcessContainerForkBun.js) uses require() to run scripts, but the compiled JavaScript is an async ES module. Bun correctly rejects the synchronous require() call on async modules, which is why it works when run directly but fails under PM2.

User [sionzee](https://github.com/sionzee) provided a workaround that is used by this project: https://github.com/oven-sh/bun/issues/19942#issuecomment-3297830230

