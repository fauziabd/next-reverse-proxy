const ORIGIN_URL = 'https://forem.geonode.com';

module.exports = async (req, res) => {
  const { url, headers } = req;
  const targetPath = url.replace(/^\/community\//, '');
  const targetUrl = `${ORIGIN_URL}/${targetPath}`;

  try {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Fetch the content from the original URL
    const response = await fetch(targetUrl);

    // Forward status code
    res.status(response.status);

    // Forward headers
    const contentType = response.headers.get('Content-Type');
    res.setHeader('Content-Type', contentType);

    if (contentType && contentType.includes('text/html')) {
      // Handle HTML content
      const body = await response.text();
      const updatedBody = body
        .replace(new RegExp(ORIGIN_URL, 'g'), `https://${headers.host}/community`)
        .replace(/href="\//g, `href="https://${headers.host}/community/`)
        .replace(/src="\//g, `src="https://${headers.host}/community/`);
      res.send(updatedBody);
    } else if (contentType && (contentType.includes('application/json') || contentType.includes('text/'))) {
      // Handle JSON and text-based content
      const text = await response.text();
      res.send(text);
    } else {
      // Handle binary data
      const buffer = await response.buffer();
      res.send(buffer);
    }
  } catch (error) {
    // Handle any errors
    res.status(500).send('Internal Server Error');
  }
};
