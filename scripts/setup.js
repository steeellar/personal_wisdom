#!/usr/bin/env node

/**
 * PDF 智能阅读器 - 跨平台设置脚本
 * 支持 Windows 和 macOS
 */

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

// 运行命令
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令退出，代码: ${code}`));
      }
    });
  });
}

// 检查 Node.js 版本
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);

  log(`Node.js 版本: ${version}`, 'cyan');
  log(`操作系统: ${os.platform()} ${os.release()}`, 'cyan');

  if (major < 22) {
    log('⚠️ 警告: Node.js 版本过低，建议升级到 22.x 或更高版本', 'yellow');
    return false;
  }

  log('✅ Node.js 版本检查通过', 'green');
  return true;
}

// 检查 npm
function checkNpm() {
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`npm 版本: ${npmVersion}`, 'cyan');
    log('✅ npm 检查通过', 'green');
    return true;
  } catch (err) {
    log('❌ 错误: 未找到 npm', 'red');
    return false;
  }
}

// 检查依赖
async function installDependencies() {
  logSection('安装依赖');

  log('📦 正在安装依赖...', 'cyan');

  try {
    await runCommand('npm', ['install']);
    log('✅ 依赖安装完成', 'green');
    return true;
  } catch (err) {
    log('❌ 依赖安装失败', 'red');
    log('💡 提示: 可以尝试使用 npm install --verbose 查看详细错误', 'yellow');
    return false;
  }
}

// 构建图标
async function buildIcons() {
  logSection('构建图标');

  const buildIconsPath = path.join(__dirname, 'build-icons.js');

  if (!fs.existsSync(buildIconsPath)) {
    log('⚠️ 未找到 build-icons.js，跳过图标构建', 'yellow');
    return;
  }

  log('🎨 正在构建图标...', 'cyan');

  try {
    await runCommand('node', ['scripts/build-icons.js']);
    log('✅ 图标构建完成', 'green');
  } catch (err) {
    log('⚠️ 图标构建失败，将使用默认图标', 'yellow');
  }
}

// 显示帮助信息
function showHelp() {
  logSection('可用命令');

  log('📝 开发命令:', 'cyan');
  log('  npm run dev       - 开发模式');
  log('  npm start         - 生产模式');
  log('');

  log('📦 构建命令:', 'cyan');
  log('  npm run build:mac - 构建 macOS 版本');
  log('  npm run build:win - 构建 Windows 版本');
  log('  npm run build:all - 构建所有平台');
  log('');
}

// 主函数
async function main() {
  console.log('');
  log('╔══════════════════════════════════╗', 'cyan');
  log('║     PDF 智能阅读器 - 设置脚本     ║', 'cyan');
  log('╚══════════════════════════════════╝', 'cyan');
  console.log('');

  logSection('环境检查');

  // 检查 Node.js 版本
  const nodeOk = checkNodeVersion();
  if (!nodeOk) {
    log('⚠️ 建议升级 Node.js 版本到 22.x 或更高', 'yellow');
  }

  console.log('');

  // 检查 npm
  const npmOk = checkNpm();
  if (!npmOk) {
    log('❌ 请先安装 Node.js 和 npm', 'red');
    process.exit(1);
  }

  console.log('');

  // 安装依赖
  const depsOk = await installDependencies();
  if (!depsOk) {
    process.exit(1);
  }

  // 构建图标
  await buildIcons();

  console.log('');
  log('✅ 设置完成!', 'green');
  console.log('');

  showHelp();
}

// 运行主函数
main().catch((err) => {
  log(`\n❌ 错误: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
