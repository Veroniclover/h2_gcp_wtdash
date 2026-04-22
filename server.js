const http = require("http");
const { exec } = require("child_process");
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});
const XRAY_PORT = 8001;

let activeConnections = 0;
let maxConnections = 0;

function getConnections(cb) {
  const cmd = `ss -tn state established '( sport = :${XRAY_PORT} )' | awk '{print $5}' | cut -d: -f1 | sort | uniq | wc -l`;

  exec(cmd, (err, stdout) => {
    if (err) return cb(0);

    let count = parseInt(stdout.trim()) || 0;
    count = Math.max(0, count - 1);
    if (count > maxConnections) {
      maxConnections = count;
    }

    cb(count);
  });
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
    res.end(JSON.stringify({
      connections: Math.max(0, activeConnections),
      max: maxConnections
    }));
    return;
  }

  if (req.url.startsWith("/v1/projects/update")) {
    activeConnections++;

    if (activeConnections > maxConnections) {
      maxConnections = activeConnections;
    }

    proxy.web(req, res, {
      target: "http://127.0.0.1:8001",
      changeOrigin: true,
      xfwd: true
    });

    res.on("finish", () => {
      activeConnections = Math.max(0, activeConnections - 1);
    });

    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(8080);
