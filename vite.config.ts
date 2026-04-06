import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'save-json-plugin',
      configureServer(server) {
        server.middlewares.use('/api/save-diagram', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                // Save it right over the main folder alongside src natively
                const target = path.resolve(process.cwd(), 'edited-roadmap-data.json');
                fs.writeFileSync(target, JSON.stringify(data, null, 2));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, path: target }));
              } catch(e) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
