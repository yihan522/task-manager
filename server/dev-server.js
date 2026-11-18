import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import handler from '../api/tasks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.all('/api/tasks', (req, res) => handler(req, res));

const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) res.status(404).send('前端尚未构建，请先执行 npm run build');
  });
});

app.listen(PORT, () => {
  console.log(`本地服务已启动: http://localhost:${PORT}`);
});
