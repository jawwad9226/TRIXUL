const fs = require("fs");
const os = require("os");
const path = require("path");

function getLocalIp() {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry && entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }

  return "localhost";
}

const localIp = getLocalIp();
const envPath = path.join(__dirname, "..", ".env");
const envContent = [
  "PORT=3000",
  "HOST=0.0.0.0",
  "CORS_ORIGIN=*",
  `LOCAL_IP=${localIp}`,
  "",
].join("\n");

fs.writeFileSync(envPath, envContent, "utf8");
console.log(`Updated ${envPath} with ${localIp}`);
