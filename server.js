const http = require("http");
const { exec } = require("child_process");
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});
const XRAY_PORT = 8001;

let activeConnections = 0;
let maxConnections = 0;

const activeIPs = new Map();
const TIMEOUT = 30000; // 30s

function getClientIP(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    return xff.split(",")[0].trim();
  }
  return req.socket.remoteAddress;
}

function cleanup() {
  const now = Date.now();
  for (const [ip, ts] of activeIPs.entries()) {
    if (now - ts > TIMEOUT) {
      activeIPs.delete(ip);
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Xray Dashboard</title>
  <style>
    body {
      font-family: Arial;
      text-align: center;
      background: #0f172a;
      color: white;
    }
    .box {
      margin-top: 80px;
      font-size: 48px;
    }
    .small {
      font-size: 20px;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <h1>Xray Connections</h1>
  <div class="box" id="count">Loading...</div>
  <div class="small">Max: <span id="max">0</span></div>

  <script>
    async function load() {
      const res = await fetch('/stats');
      const data = await res.json();

      document.getElementById('count').innerText = data.connections;
      document.getElementById('max').innerText = data.max;
    }

    load();
  </script>
</body>
</html>
    `);
    return;
  }

  if (req.url === "/stats") {
    cleanup();
    res.end(JSON.stringify({
      connections: activeIPs.size,
      max: maxConnections
    }));
    return;
  }

  if (req.url.startsWith("/v1/projects/update")) {
    //const ip = getClientIP(req);
    //activeIPs.set(ip, Date.now());
    const key = getClientIP(req) + "|" + req.headers["user-agent"];
    activeIPs.set(key, Date.now());
    cleanup();
    if (activeIPs.size > maxConnections) {
      maxConnections = activeIPs.size;
    }
    proxy.web(req, res, {
      target: "http://127.0.0.1:8001",
      changeOrigin: true,
      xfwd: true
    });
    
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(8080);
