import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 尝试使用 npx 运行 electron
const electron = spawn('npx', ['--yes', 'electron@28.0.0', '.', '--dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

electron.on('error', (err) => {
  console.error('启动失败:', err.message);
  console.log('请手动安装 electron: npm install electron@28.0.0 --save-dev');
  process.exit(1);
});

electron.on('exit', (code) => {
  process.exit(code);
});
