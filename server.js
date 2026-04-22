const http = require("http");
const { exec } = require("child_process");
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});

const XRAY_PORT = 8001;

function getConnections(cb) {
  exec(`ss -tn state established '( sport = :${XRAY_PORT} )' | awk '{print $5}' | cut -d: -f1 | sort | uniq | wc -l`, (err, stdout) => {
    if (err) return cb(0);
    cb(parseInt(stdout.trim()) || 0);
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
      margin-top: 100px;
      font-size: 48px;
    }
  </style>
</head>
<body>
  <h1>Xray Active Connections</h1>
  <div class="box" id="count">Loading...</div>

  <script>
    async function load() {
      const res = await fetch('/stats');
      const data = await res.json();
      document.getElementById('count').innerText = data.connections;
    }
    load();
  </script>
</body>
</html>
    `);
    return;
  }

  
  if (req.url === "/stats") {
    getConnections((count) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ connections: count }));
    });
    return;
  }
  
  if (req.url.startsWith("/v1/projects/update")) {
    proxy.web(req, res, {
      target: `http://127.0.0.1:${XRAY_PORT}`
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(8080, () => {
  console.log("Server running on 8080");
});
