const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const port = 3000; // The port your Express server will listen on

// Replace relative paths with absolute paths
const rewriteHTML = (body, req) => {
  return body.toString().replace(/(href|src)="\/(.*?)"/g, (match, p1, p2) => {
    return `${p1}="https://${req.headers.host}/community/${p2}"`;
  });
};

// Middleware to rewrite URLs in HTML responses
const htmlRewriteMiddleware = (req, res, next) => {
  let _write = res.write;
  let _end = res.end;
  let _writeHead = res.writeHead;
  let body = [];

  res.write = function (chunk) {
    body.push(chunk);
  };

  res.end = function (chunk) {
    if (chunk) body.push(chunk);

    if (res.get('Content-Type')?.includes('text/html')) {
      body = Buffer.concat(body);
      body = rewriteHTML(body, req);
      res.setHeader('Content-Length', Buffer.byteLength(body));
      _write.call(res, body);
    } else {
      for (let i = 0; i < body.length; i++) {
        _write.call(res, body[i]);
      }
    }

    _end.call(res);
  };

  res.writeHead = function () {
    _writeHead.apply(res, arguments);
  };

  next();
};

// Proxy middleware options
const proxyOptions = {
  target: 'http://forem.geonode.com', // The target host
  changeOrigin: true,
  selfHandleResponse: true, // Handle response manually
  onProxyRes: (proxyRes, req, res) => {
    // Modify the response headers
    if (proxyRes.headers['content-type']?.includes('text/html')) {
      delete proxyRes.headers['content-length'];
      res.removeHeader('Content-Length');
    }
  }
};

// Use the htmlRewriteMiddleware for HTML responses
app.use('/community', htmlRewriteMiddleware, createProxyMiddleware(proxyOptions));

// Start the Express server
app.listen(port, () => {
  console.log(`Reverse proxy server running on port ${port}`);
});
