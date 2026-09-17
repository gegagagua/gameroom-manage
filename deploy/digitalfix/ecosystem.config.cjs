// pm2 apps for digitalfix.cloud/mirage-manage (web 3104, API 4104; env from apps/api/.env and apps/web/.env.local)
const root = require("path").resolve(__dirname, "../..");
module.exports = {
  apps: [
    { name: "mirage-manage-api", cwd: root + "/apps/api", script: "dist/main.js", env: { NODE_ENV: "production" } },
    { name: "mirage-manage-web", cwd: root + "/apps/web", script: root + "/node_modules/next/dist/bin/next", args: "start -p 3104 -H 127.0.0.1", env: { NODE_ENV: "production" } },
  ],
};
