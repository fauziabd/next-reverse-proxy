const express = require('express');
const http = require('http');
const { Transform } = require('stream');

const app = express();
const targetHost = 'forem.geonode.com';

// Middleware to modify the response
const modifyResponseBody = (req, res, next) => {
  let body = [];

  const _write = res.write;
  const _end = res.end;

  res.write = function (chunk) {
    body.push(chunk);
    return _write.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) {
      body.push(chunk);
    }

    const fullBody = Buffer.concat(body).toString('utf8');
    const updatedBody = fullBody.replace(/\/\/forem\.geonode\.com/g, `//${req.headers.host}/community`);

    _end.call(res, updatedBody);
  };

  next();
};

// Proxy request to target
app.use('/community', modifyResponseBody, (req, res) => {
  const options = {
    hostname: targetHost,
    port: 443, // or 443 if https
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, {
      end: true
    });
  });

  req.pipe(proxyReq, {
    end: true
  });

  proxyReq.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    res.status(500).send(e.message);
  });
});

app.listen(3000, () => {
  console.log('Reverse proxy listening on port 3000');
});
