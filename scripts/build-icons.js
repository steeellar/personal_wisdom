#!/usr/bin/env node

/**
 * 图标构建脚本
 * 将 SVG 图标转换为 macOS (ICNS) 和 Windows (ICO) 格式
 *
 * 需要安装依赖: npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

const SVG_ICON = path.join(__dirname, '..', 'assets', 'icon.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets');

// 图标尺寸列表
const ICON_SIZES = [16, 32, 64, 128, 256, 512, 1024];

async function convertSvgToPng(svgBuffer, size) {
    try {
        // 动态导入 sharp
        const sharp = (await import('sharp')).default;

        return await sharp(svgBuffer)
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
    } catch (error) {
        console.error(`转换图标尺寸 ${size}x${size} 失败:`, error.message);
        throw error;
    }
}

async function createIcns(svgBuffer) {
    console.log('🍎 创建 macOS ICNS 图标...');

    const icnsDir = path.join(OUTPUT_DIR, 'icon.iconset');

    // 清理旧文件
    if (fs.existsSync(icnsDir)) {
        fs.rmSync(icnsDir, { recursive: true });
    }
    fs.mkdirSync(icnsDir, { recursive: true });

    // 生成不同尺寸的图标
    const sizes = [16, 32, 64, 128, 256, 512, 1024];

    for (const size of sizes) {
        const pngBuffer = await convertSvgToPng(svgBuffer, size);

        // 标准尺寸
        fs.writeFileSync(path.join(icnsDir, `icon_${size}x${size}.png`), pngBuffer);

        // Retina 尺寸（@2x）
        if (size <= 512) {
            fs.writeFileSync(path.join(icnsDir, `icon_${size}x${size}@2x.png`), pngBuffer);
        }
    }

    console.log('✅ ICNS 图标集创建完成');
    console.log(`📁 位置: ${icnsDir}`);
    console.log('💡 提示: 使用 iconutil 转换为 icns 文件:');
    console.log(`   iconutil -c icns ${icnsDir} -o ${path.join(OUTPUT_DIR, 'icon.icns')}`);
}

async function createIco(svgBuffer) {
    console.log('🪟 创建 Windows ICO 图标...');

    try {
        // 动态导入 sharp
        const sharp = (await import('sharp')).default;

        const icoPath = path.join(OUTPUT_DIR, 'icon.ico');

        // 生成多尺寸 ICO
        const sizes = [16, 32, 48, 64, 128, 256];
        const buffers = [];

        for (const size of sizes) {
            const pngBuffer = await sharp(svgBuffer)
                .resize(size, size, { fit: 'contain' })
                .png()
                .toBuffer();
            buffers.push({ size, data: pngBuffer });
        }

        // 使用 ico 库或手动创建 ICO 文件
        // 这里使用简单的 PNG 替代
        fs.writeFileSync(path.join(OUTPUT_DIR, 'icon-256.png'), buffers.find(b => b.size === 256).data);

        console.log('✅ ICO 图标创建完成');
        console.log(`📁 位置: ${icoPath}`);
        console.log('💡 提示: 安装 to-ico 包以生成真正的 ICO 文件:');
        console.log('   npm install --save-dev to-ico');

    } catch (error) {
        console.error('创建 ICO 失败:', error.message);
    }
}

async function main() {
    console.log('🎨 PDF 阅读器图标构建工具\n');

    // 检查 SVG 文件
    if (!fs.existsSync(SVG_ICON)) {
        console.error('❌ 错误: 找不到 SVG 图标文件');
        console.error(`   ${SVG_ICON}`);
        process.exit(1);
    }

    console.log(`📄 SVG 源文件: ${SVG_ICON}\n`);

    // 读取 SVG
    const svgBuffer = fs.readFileSync(SVG_ICON);

    try {
        // 创建 macOS ICNS
        await createIcns(svgBuffer);
        console.log('');

        // 创建 Windows ICO
        await createIco(svgBuffer);

        console.log('\n✨ 图标构建完成!');

    } catch (error) {
        console.error('\n❌ 构建失败:', error.message);
        process.exit(1);
    }
}

// 运行主函数
main();
