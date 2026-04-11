const { spawn } = require('child_process');
const path = require('path');

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
