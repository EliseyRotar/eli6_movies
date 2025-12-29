import http.server
import socketserver
import socket

PORT = 1234  # Change this port if needed

# Get your local IP address
hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)

Handler = http.server.SimpleHTTPRequestHandler

# Allow connections from other devices on the network (bind to all interfaces)
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://{local_ip}:{PORT}")
    print("Press Ctrl+C to stop the server.")
    httpd.serve_forever()
