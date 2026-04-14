import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import fs from 'fs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/')) {
              const apiPath = req.url.split('?')[0];
              const filePath = path.join(process.cwd(), apiPath + '.ts');
              
              if (fs.existsSync(filePath)) {
                try {
                  const { default: handler } = await server.ssrLoadModule(filePath);
                  
                  if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    await new Promise(resolve => req.on('end', resolve));
                    try {
                      (req as any).body = JSON.parse(body);
                    } catch (e) {
                      (req as any).body = {};
                    }
                  }

                  (res as any).status = (code: number) => {
                    res.statusCode = code;
                    return res;
                  };
                  (res as any).json = (data: any) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  };

                  await handler(req, res);
                  return;
                } catch (error) {
                  console.error('API Error:', error);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Internal Server Error' }));
                  return;
                }
              }
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
