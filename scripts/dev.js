#!/usr/bin/env node

/**
 * 开发服务器启动脚本
 * 自动检查环境并启动 Electron
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '..');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`══ ${title} ══`, 'bright');
  console.log('');
}

// 检查 Node.js 版本
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);

  log(`Node.js 版本: ${version}`, 'cyan');

  if (major < 18) {
    log('⚠️ 警告: Node.js 版本过低，建议升级到 18.x 或更高版本', 'yellow');
    return false;
  }

  log('✅ Node.js 版本检查通过', 'green');
  return true;
}

// 检查依赖
function checkDependencies() {
  const nodeModulesPath = path.join(PROJECT_ROOT, 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    log('❌ 未找到 node_modules，请先运行 npm install', 'red');
    return false;
  }

  // 检查关键依赖
  const requiredPackages = ['electron', 'pdfjs-dist'];
  for (const pkg of requiredPackages) {
    const pkgPath = path.join(nodeModulesPath, pkg);
    if (!fs.existsSync(pkgPath)) {
      log(`❌ 缺少依赖: ${pkg}`, 'red');
      return false;
    }
  }

  log('✅ 依赖检查通过', 'green');
  return true;
}

// 启动 Electron
function startElectron() {
  logSection('启动应用');

  // 使用 npx electron 跨平台方式启动
  const electronPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['--yes', 'electron@39.8.0', '.', '--dev'];

  log('🚀 正在启动 Electron...', 'cyan');

  const proc = spawn(electronPath, args, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  proc.on('error', (err) => {
    log(`❌ 启动失败: ${err.message}`, 'red');
    process.exit(1);
  });

  proc.on('exit', (code) => {
    log(`\n👋 Electron 已退出 (代码: ${code})`, 'yellow');
    process.exit(code);
  });

  // 处理进程终止
  process.on('SIGINT', () => {
    log('\n🛑 正在关闭...', 'yellow');
    proc.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    proc.kill('SIGTERM');
  });
}

// 主函数
async function main() {
  console.log('');
  log('╔══════════════════════════════════╗', 'cyan');
  log('║     PDF 智能阅读器 - 开发模式     ║', 'cyan');
  log('╚══════════════════════════════════╝', 'cyan');
  console.log('');

  logSection('环境检查');

  // 检查 Node.js 版本
  const nodeOk = checkNodeVersion();
  if (!nodeOk) {
    log('⚠️ 建议升级 Node.js 版本', 'yellow');
  }

  console.log('');

  // 检查依赖
  const depsOk = checkDependencies();
  if (!depsOk) {
    log('\n❌ 请先运行: npm install', 'red');
    process.exit(1);
  }

  // 启动 Electron
  startElectron();
}

// 运行主函数
main().catch((err) => {
  log(`\n❌ 错误: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
