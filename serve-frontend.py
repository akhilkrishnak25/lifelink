import http.server
import socketserver
from urllib.parse import urlparse


class RewriteHandler(http.server.SimpleHTTPRequestHandler):
    """Simple static server with a few friendly rewrites.

    This project uses plain HTML files (login.html, register.html), but some
    links or browser history may hit /login or /register. Python's default
    http.server would 404 those paths. We rewrite them to the correct files.
    """

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        rewrites = {
            '/login': '/login.html',
            '/register': '/register.html',
            '/home': '/home.html',
        }

        if path in rewrites:
            self.path = rewrites[path] + (('?' + parsed.query) if parsed.query else '')

        return super().do_GET()


def main():
    port = 3000
    with socketserver.TCPServer(("", port), RewriteHandler) as httpd:
        print(f"Serving frontend on http://localhost:{port}")
        print("Rewrites: /login -> /login.html, /register -> /register.html, /home -> /home.html")
        httpd.serve_forever()


if __name__ == '__main__':
    main()
