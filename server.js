const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const httpProxy = require('http-proxy');
const cheerio = require('cheerio');
const { Transform } = require('stream');

const app = express();
const targetUrl = 'https://forem.geonode.com';
const proxy = httpProxy.createProxyServer({});

// Function to update HTML content
const updateHtmlContent = (body, req) => {
  const $ = cheerio.load(body);
  $('img, script, link').each((i, elem) => {
    const tagName = elem.name;
    const attribute = tagName === 'link' ? 'href' : 'src';
    const value = $(elem).attr(attribute);
    if (value && !value.startsWith('http')) {
      // Replace the relative path with the absolute path
      $(elem).attr(attribute, `https://${req.headers.host}/community${value.startsWith('/') ? '' : '/'}${value}`);
    }
  });
  return $.html();
};

// Function to replace the hostname in other types of content
const replaceHostname = (chunk, req) => {
  let data = chunk.toString();
  data = data.replace(/forem\.geonode\.com/g, `${req.headers.host}/community`);
  return data;
};

// Middleware to modify the response
const modifyResponse = (req, res, proxyRes, options) => {
  let originalBody = Buffer.from([]);
  const contentType = proxyRes.headers['content-type'];

  if (contentType && contentType.includes('text/html')) {
    proxyRes.on('data', (data) => {
      originalBody = Buffer.concat([originalBody, data]);
    });

    proxyRes.on('end', () => {
      const updatedBody = updateHtmlContent(originalBody.toString(), req);
      res.end(updatedBody);
    });

    proxyRes.pipe(new Transform({
      transform(chunk, encoding, callback) {
        const updatedChunk = replaceHostname(chunk, req);
        this.push(updatedChunk);
        callback();
      }
    })).pipe(res);
  } else {
    proxyRes.pipe(new Transform({
      transform(chunk, encoding, callback) {
        const updatedChunk = replaceHostname(chunk, req);
        this.push(updatedChunk);
        callback();
      }
    })).pipe(res);
  }
};

// Use proxy middleware
app.use('/community', createProxyMiddleware({
  target: targetUrl,
  changeOrigin: true,
  selfHandleResponse: true, // Handle response in middleware
  onProxyRes: modifyResponse,
}));

app.listen(3000, () => {
  console.log('Reverse proxy listening on port 3000');
});
