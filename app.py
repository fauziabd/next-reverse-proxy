from flask import Flask, request, Response
import requests
from urllib.parse import urljoin, urlparse

app = Flask(__name__)

# Your proxy configuration
PROXY_TARGET = 'https://forem.geonode.com'
PROXY_BASE_URL = '/community'

@app.route('/community/<path:url>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(url):
    # Build the actual URL
    actual_url = urljoin(PROXY_TARGET, url)

    # Forward the request to the target server
    resp = requests.request(
        method=request.method,
        url=actual_url,
        headers={key: value for (key, value) in request.headers if key != 'Host'},
        data=request.get_data(),
        cookies=request.cookies,
        allow_redirects=False,
        stream=True)

    # Modify the response content if necessary
    content = resp.content
    if resp.headers.get('Content-Type', '').split(';')[0] in ['text/html', 'application/javascript', 'text/css']:
        # Replace the host in the content
        content = content.replace(b'href="/', f'href="{PROXY_BASE_URL}/'.encode())
        content = content.replace(b'src="/', f'src="{PROXY_BASE_URL}/'.encode())
        content = content.replace(b'url(/', f'url({PROXY_BASE_URL}/'.encode())
        content = content.replace(b'@import "/', f'@import "{PROXY_BASE_URL}/'.encode())
        content = content.replace(b'https://forem.geonode.com', f'/community'.encode())

    # Create a response object
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
    headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]

    # Replace the location header with the proxy base for redirects
    for header in headers:
        if header[0].lower() == 'location':
            target_url_parts = urlparse(header[1])
            new_target_url = target_url_parts._replace(netloc=request.host, scheme=request.scheme)
            headers.remove(header)
            headers.append((header[0], new_target_url.geturl()))

    proxy_response = Response(content, resp.status_code, headers)
    return proxy_response

if __name__ == '__main__':
    app.run(debug=True)
