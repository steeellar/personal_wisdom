// 导入 prompt 模板
import {
    SINGLE_DOC_PROMPT_TEMPLATE,
    KNOWLEDGE_BASE_NO_DOCS_PROMPT_TEMPLATE,
    KNOWLEDGE_BASE_WITH_DOCS_PROMPT_TEMPLATE,
    GENERATE_SUMMARY_SYSTEM_PROMPT,
    GENERATE_SUMMARY_USER_PROMPT_TEMPLATE,
    FIND_RELEVANT_DOCS_SYSTEM_PROMPT_TEMPLATE,
    FIND_RELEVANT_DOCS_USER_PROMPT_TEMPLATE,
    FEW_SHOT_EXAMPLE,
    TOKEN_LIMITS,
    MODEL_PARAMS
} from './prompts.js';

// 状态变量
let pdfDoc = null;
let docText = '';
let scale = 1.0;
let chatHistories = {}; // 按文件路径隔离的对话历史 { filePath: [{role, content}, ...] }
let selectedText = '';
let currentFile = null;
let fileContents = {}; // 文件内容缓存
let folderStructure = null; // 文件夹结构
let currentFolderPath = ''; // 当前文件夹路径
let basePath = ''; // 知识库基础路径（用于解析相对路径）
let currentMode = 'single'; // 当前模式: 'single' 或 'knowledge'
let knowledgeBase = {}; // 知识库: { filePath: { name, type, text } }
let knowledgeFiles = []; // 知识库中的文件列表
let knowledgeIndex = []; // 知识库索引
let isBuildingIndex = false; // 是否正在构建索引

// DOM 元素
let fileTree, docContent, welcomeZone, pdfContainer, markdownContainer, docxContainer;
let pageInfo, zoomIn, zoomOut, zoomLevel, chatMessages, chatInput, sendBtn, clearChat, autoExtract;
let askSelectionBtn, modeSingle, modeKnowledge, knowledgeStatus, knowledgeDocCount;
let buildIndexBtn, indexStatus, indexDocCount, settingsBtn, settingsModal;

// 暴露给全局，方便调试
window.pdfjsLib = window['pdfjs-dist/build/pdf'];

// 检查是否在 Electron 环境中
function isElectron() {
    return typeof window !== 'undefined' &&
           typeof window.electronAPI !== 'undefined';
}

// 显示 Toast 消息
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // 2秒后自动移除
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// 加载工作区文件夹
async function loadWorkspaceFolder(path) {
    if (!path) {
        showToast('请先在设置中配置工作区路径', 'warning');
        settingsBtn.click();
        return;
    }

    try {
        const result = await window.electronAPI.loadFolder(path);
        if (result.success && result.structure) {
            folderStructure = result.structure;
            currentFolderPath = path;
            renderFileTree(result.structure);
            // 构建知识库文件列表
            knowledgeFiles = [];
            buildKnowledgeFileList(result.structure);
            if (knowledgeFiles.length > 0) {
                knowledgeStatus.classList.remove('hidden');
                knowledgeDocCount.textContent = `${knowledgeFiles.length} 份文档`;
                buildIndexBtn.classList.remove('hidden');
                showToast(`工作区已加载，包含 ${knowledgeFiles.length} 个文档文件`, 'success');

                // 尝试加载已有索引
                await loadExistingIndex();
            } else {
                showToast('工作区中没有找到支持的文档文件', 'warning');
            }
        } else {
            showToast('加载工作区失败：' + (result.error || '未知错误'), 'error');
        }
    } catch (error) {
        showToast('加载工作区失败：' + error.message, 'error');
    }
}

// 构建知识库文件列表（递归遍历）
function buildKnowledgeFileList(items) {
    items.forEach(item => {
        if (item.type === 'folder') {
            buildKnowledgeFileList(item.children);
        } else if (item.type) {
            knowledgeFiles.push({
                name: item.name,
                path: item.path,
                type: item.type
            });
        }
    });
}

// 模式切换
function switchMode(mode) {
    currentMode = mode;
    const chatPanel = document.querySelector('div.w-96');

    // 更新按钮样式
    if (mode === 'single') {
        modeSingle.className = 'mode-btn flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition bg-white text-blue-600 shadow-sm';
        modeKnowledge.className = 'mode-btn flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition text-gray-500 hover:text-gray-700';
        chatInput.placeholder = currentFile ? `向 AI 提问关于 ${currentFile.name} 的内容...` : '选择文档后开始提问';
        showToast('已切换到单文档模式');

        // 恢复文档显示区，恢复问答区宽度
        docContent.classList.remove('hidden');
        chatPanel.style.width = '384px';
        chatPanel.style.flex = '';
    } else {
        modeKnowledge.className = 'mode-btn flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition bg-white text-blue-600 shadow-sm';
        modeSingle.className = 'mode-btn flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition text-gray-500 hover:text-gray-700';
        chatInput.placeholder = '向整个知识库提问...';
        showToast(`已切换到知识库模式，可对 ${knowledgeFiles.length} 个文档进行综合分析`);

        // 隐藏文档显示区，扩大问答区
        docContent.classList.add('hidden');
        chatPanel.style.width = '';
        chatPanel.style.flex = '1';
    }

    // 启用输入框
    if (currentMode === 'knowledge' && knowledgeFiles.length > 0) {
        chatInput.disabled = false;
        sendBtn.disabled = false;
    }
}

// 加载已有索引
async function loadExistingIndex() {
    try {
        const result = await window.electronAPI.loadKnowledgeIndex(currentFolderPath);
        if (result.success) {
            knowledgeIndex = result.index;
            basePath = currentFolderPath; // 保存基础路径用于解析相对路径
            indexStatus.classList.remove('hidden');
            indexDocCount.textContent = `已索引 ${knowledgeIndex.length} 份`;
            showToast(`已加载知识库索引（${knowledgeIndex.length} 份文档），可快速检索`, 'success');
        }
    } catch (error) {
        console.error('加载索引失败:', error);
    }
}

// 生成文档摘要和关键词（使用 AI - 优化版本）
async function generateDocumentSummary(text, fileName) {
    try {
        const apiUrl = window.appConfig.apiUrl;
        const apiKey = window.appConfig.apiKey;
        const modelName = window.appConfig.modelName;

        // 截取前 3000 个字符用于生成摘要
        const textSnippet = text.substring(0, 3000);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                max_tokens: TOKEN_LIMITS.MAX_SUMMARY_TOKENS,
                ...MODEL_PARAMS.SUMMARY,
                messages: [
                    { role: 'system', content: GENERATE_SUMMARY_SYSTEM_PROMPT },
                    { role: 'user', content: GENERATE_SUMMARY_USER_PROMPT_TEMPLATE(fileName, textSnippet) }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API 请求失败');
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '';

        // 解析摘要和关键词
        let summary = '';
        let keywords = [];

        const summaryMatch = content.match(/摘要[:：]\s*(.+)/);
        const keywordsMatch = content.match(/关键词[:：]\s*(.+)/);

        if (summaryMatch) {
            summary = summaryMatch[1].trim();
        } else {
            summary = content.replace(/^摘要[:：]\s*/, '').trim();
        }

        if (keywordsMatch) {
            keywords = keywordsMatch[1].split(/[,，、;；]/).map(k => k.trim()).filter(k => k);
        }

        return { summary: summary || '[摘要生成失败]', keywords };

    } catch (error) {
        console.error('生成摘要失败:', error);
        // 失败时使用简单的前 200 字符作为摘要
        return { summary: text.substring(0, 200).replace(/\s+/g, ' ').trim() + '...', keywords: [] };
    }
}

// 查找相关文档（使用 AI 进行智能匹配 - 优化版本）
async function findRelevantDocuments(question) {
    try {
        const apiUrl = window.appConfig.apiUrl;
        const apiKey = window.appConfig.apiKey;
        const modelName = window.appConfig.modelName;

        // 构建索引摘要
        const indexSummary = knowledgeIndex.map((doc, index) => {
            const keywordsStr = doc.keywords && doc.keywords.length > 0 ? `\n关键词: ${doc.keywords.join(', ')}` : '';
            return `[${index + 1}] ${doc.name}\n摘要: ${doc.summary}${keywordsStr}`;
        }).join('\n\n');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                max_tokens: 100,
                ...MODEL_PARAMS.RETRIEVAL,
                messages: [
                    { role: 'system', content: FIND_RELEVANT_DOCS_SYSTEM_PROMPT_TEMPLATE(knowledgeIndex.length) },
                    { role: 'user', content: FIND_RELEVANT_DOCS_USER_PROMPT_TEMPLATE(knowledgeIndex.length, indexSummary, question) }
                ]
            })
        });

        if (!response.ok) {
            console.error('检索API失败:', response.status);
            // 如果失败，返回所有文档
            return knowledgeIndex;
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content || '无';

        console.log('AI 检索结果:', result);

        // 解析结果 - 支持多种"无"的表达方式
        const trimmedResult = result.trim().toLowerCase();
        if (trimmedResult === '无' || trimmedResult === 'none' || trimmedResult === '没有' || trimmedResult === '不相关' || trimmedResult === '未找到' || trimmedResult === 'no') {
            return [];
        }

        // 提取数字编号
        const numbers = result.match(/\d+/g);
        if (!numbers || numbers.length === 0) {
            return [];
        }

        // 获取对应的文档（限制最多 5 个）
        const relevantDocs = [];
        for (const num of numbers) {
            const index = parseInt(num) - 1;
            if (index >= 0 && index < knowledgeIndex.length) {
                if (!relevantDocs.find(d => d.path === knowledgeIndex[index].path)) {
                    relevantDocs.push(knowledgeIndex[index]);
                }
            }
            if (relevantDocs.length >= 5) break;
        }

        return relevantDocs;

    } catch (error) {
        console.error('检索相关文档失败:', error);
        // 失败时返回所有文档
        return knowledgeIndex;
    }
}

// 渲染文件树
function renderFileTree(items) {
    fileTree.innerHTML = '';

    if (!items || items.length === 0) {
        fileTree.innerHTML = `
            <div class="empty-files">
                <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <p class="text-sm">文件夹中没有支持的文件</p>
            </div>
        `;
        return;
    }

    items.forEach(item => {
        if (item.type === 'folder') {
            const folderDiv = createFolderElement(item);
            fileTree.appendChild(folderDiv);
        } else {
            const fileDiv = createFileElement(item);
            fileTree.appendChild(fileDiv);
        }
    });
}

// 创建文件夹元素
function createFolderElement(folder) {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'file-tree-folder';
    folderDiv.classList.add('expanded'); // 默认展开

    const header = document.createElement('div');
    header.className = 'file-tree-item-header file-tree-item';
    header.innerHTML = `
        <svg class="file-tree-icon folder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <span class="text-sm text-gray-700">${folder.name}</span>
    `;

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'file-tree-children';

    // 添加子文件
    if (folder.children && folder.children.length > 0) {
        folder.children.forEach(child => {
            if (child.type === 'folder') {
                childrenContainer.appendChild(createFolderElement(child));
            } else {
                childrenContainer.appendChild(createFileElement(child));
            }
        });
    }

    // 点击展开/折叠
    header.addEventListener('click', () => {
        folderDiv.classList.toggle('expanded');
    });

    folderDiv.appendChild(header);
    folderDiv.appendChild(childrenContainer);

    return folderDiv;
}

// 创建文件元素
function createFileElement(file) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file-tree-file file-tree-item';
    fileDiv.dataset.path = file.path;
    fileDiv.dataset.type = file.type;

    let iconClass = 'pdf-icon';
    let iconPath = 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';

    if (file.type === 'pdf') {
        iconClass = 'pdf-icon';
        iconPath = 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
    } else if (file.type === 'docx') {
        iconClass = 'docx-icon';
        iconPath = 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM9 19h-2v-2h2v2zm0-4h-2v-4h2v4zm8 4h-6v-2h6v2zm0-4h-6v-4h6v4z';
    } else if (file.type === 'markdown') {
        iconClass = 'md-icon';
        iconPath = 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01 2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    } else if (file.type === 'text') {
        iconClass = 'txt-icon';
        iconPath = 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01 2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }

    fileDiv.innerHTML = `
        <svg class="file-tree-icon ${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
        </svg>
        <span class="text-sm text-gray-700">${file.name}</span>
    `;

    // 点击加载文件
    fileDiv.addEventListener('click', async () => {
        // 移除之前的选中状态
        document.querySelectorAll('.file-tree-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        fileDiv.classList.add('selected');

        await loadFile(file);
    });

    return fileDiv;
}

// 加载文件
async function loadFile(file) {
    currentFile = file;
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = `向 AI 提问关于 ${file.name} 的内容...`;

    // 如果当前是知识库模式，自动切回单文档模式
    if (currentMode === 'knowledge') {
        switchMode('single');
    }

    // 清空文档内容显示区
    welcomeZone.classList.add('hidden');
    pdfContainer.classList.add('hidden');
    markdownContainer.classList.add('hidden');
    docxContainer.classList.add('hidden');
    pageInfo.classList.add('hidden');
    zoomIn.classList.add('hidden');
    zoomOut.classList.add('hidden');
    zoomLevel.classList.add('hidden');

    // 重置 PDF 相关状态
    pdfDoc = null;
    pdfContainer.innerHTML = '';

    try {
        let fileData;

        // 检查缓存
        if (fileContents[file.path]) {
            fileData = fileContents[file.path];
        } else {
            // 从 Electron 读取文件
            if (isElectron()) {
                const result = await window.electronAPI.readFile(file.path);
                if (result.success) {
                    fileData = new Uint8Array(result.data);
                    fileContents[file.path] = fileData; // 缓存
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('文件读取功能仅在 Electron 环境中可用');
            }
        }

        // 根据文件类型处理
        if (file.type === 'pdf') {
            await loadPDFContent(fileData);
        } else if (file.type === 'docx') {
            await loadDOCXContent(fileData);
        } else if (file.type === 'markdown' || file.type === 'text') {
            await loadMarkdownContent(fileData);
        }

        // 加载该文件的对话历史
        await loadFileChatHistory(file.path);

    } catch (error) {
        console.error('文件加载失败:', error);
        showToast(`文件 ${file.name} 加载失败: ${error.message}`, 'error');
    }
}

// 加载文件的对话历史
async function loadFileChatHistory(filePath) {
    if (!isElectron()) return;

    try {
        const result = await window.electronAPI.loadChatHistory(filePath);
        if (result.success) {
            const history = result.history || [];
            chatHistories[filePath] = history;
            renderChatHistory();
        }
    } catch (error) {
        console.error('加载对话历史失败:', error);
    }
}

// 渲染对话历史
function renderChatHistory() {
    if (!currentFile) return;

    const history = chatHistories[currentFile.path] || [];

    if (history.length === 0) {
        chatMessages.innerHTML = `
            <div class="text-center text-gray-400 text-sm py-8">
                <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
                <p>上传文档后可以向 AI 提的问</p>
                <p class="text-xs mt-1">AI 将基于文档内容回答</p>
            </div>
        `;
    } else {
        chatMessages.innerHTML = '';
        history.forEach(msg => {
            addMessageToDOM(msg.role, msg.content);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 添加消息到 DOM（不保存到历史）
function addMessageToDOM(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user-message' : role === 'ai' ? 'ai-message' : 'bg-blue-50 text-blue-800'} px-4 py-2.5 rounded-2xl text-sm`;

    if (role === 'loading') {
        messageDiv.className = 'message ai-message px-4 py-2.5 rounded-2xl text-sm';
        messageDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    } else if (role === 'ai') {
        // 使用 marked 渲染 Markdown
        messageDiv.innerHTML = typeof window.marked !== 'undefined' ? window.marked.parse(content) : content;
        // 添加 Markdown 样式支持
        messageDiv.classList.add('markdown-content');
    } else {
        messageDiv.textContent = content;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

// 加载 PDF 内容
async function loadPDFContent(arrayBuffer) {
    try {
        // 创建新的ArrayBuffer副本，因为PDF.js的worker会detach原始buffer
        const bufferCopy = arrayBuffer.buffer.slice(0);
        const uint8ArrayCopy = new Uint8Array(bufferCopy);

        pdfDoc = await pdfjsLib.getDocument({ data: uint8ArrayCopy }).promise;
        pdfContainer.classList.remove('hidden');
        pdfContainer.innerHTML = '';

        pageInfo.textContent = `共 ${pdfDoc.numPages} 页面`;
        pageInfo.classList.remove('hidden');
        zoomIn.classList.remove('hidden');
        zoomOut.classList.remove('hidden');
        zoomLevel.classList.remove('hidden');

        // 渲染所有页面
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            await renderPage(i);
        }

        // 提取文本
        if (autoExtract.checked) {
            await extractText();
        }

        showToast('PDF 加载完成！可以开始提问。', 'success');
    } catch (error) {
        console.error('PDF 加载失败:', error);
        throw error;
    }
}

// 加载 DOCX 内容
async function loadDOCXContent(arrayBuffer) {
    try {
        // 创建新的ArrayBuffer副本
        const bufferCopy = arrayBuffer.buffer.slice(0);
        const uint8ArrayCopy = new Uint8Array(bufferCopy);

        const result = await mammoth.convertToHtml({ arrayBuffer: uint8ArrayCopy });
        docxContainer.classList.remove('hidden');
        docxContainer.innerHTML = `<div class="docx-render">${result.value}</div>`;
        docText = result.value;

        showToast('DOCX 文档加载完成！可以开始提问。', 'success');
    } catch (error) {
        console.error('DOCX 加载失败:', error);
        throw error;
    }
}

// 加载 Markdown 内容
async function loadMarkdownContent(arrayBuffer) {
    try {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(arrayBuffer);
        docText = text;

        markdownContainer.classList.remove('hidden');
        const markdownContent = typeof window.marked !== 'undefined' ? window.marked.parse(text) : text;
        markdownContainer.innerHTML = `<div class="markdown-render">${markdownContent}</div>`;

        showToast('文档加载完成！可以开始提问。', 'success');
    } catch (error) {
        console.error('文档加载失败:', error);
        throw error;
    }
}

// 渲染页面
async function renderPage(num) {
    const page = await pdfDoc.getPage(num);

    // 获取设备像素比，提高清晰度
    const pixelRatio = window.devicePixelRatio || 1;
    const outputScale = pixelRatio;

    const viewport = page.getViewport({ scale: scale * outputScale });

    // 创建页面容器
    const pageDiv = document.createElement('div');
    pageDiv.className = 'pdf-page-wrapper';
    pageDiv.style.width = `${viewport.width / outputScale}px`;
    pageDiv.style.height = `${viewport.height / outputScale}px`;
    pageDiv.style.position = 'relative';
    pageDiv.style.margin = '20px auto';
    pageDiv.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    pageDiv.style.background = 'white';

    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = `${viewport.width / outputScale}px`;
    canvas.style.height = `${viewport.height / outputScale}px`;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    ctx.scale(outputScale, outputScale);

    const renderViewport = page.getViewport({ scale });
    await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

    // 创建文本层（用于文本选择）使用PDF.js官方文本层渲染器
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.position = 'absolute';
    textLayerDiv.style.left = '0';
    textLayerDiv.style.top = '0';
    textLayerDiv.style.width = `${viewport.width / outputScale}px`;
    textLayerDiv.style.height = `${viewport.height / outputScale}px`;
    textLayerDiv.style.zIndex = '10';

    // 获取文本内容
    const textContent = await page.getTextContent();

    // 使用PDF.js官方文本层渲染器
    if (window.pdfjsLib && window.pdfjsLib.renderTextLayer) {
        // 使用PDF.js 3.x版本的渲染方式
        window.pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: renderViewport,
            textDivs: [],
            enhanceTextSelection: true,
            includeMarkedContent: false
        });
    } else {
        // 兼容性方案：手动创建文本元素
        const textLayerViewport = page.getViewport({ scale });
        textContent.items.forEach(item => {
            if (item.str) {
                const textDiv = document.createElement('div');
                textDiv.textContent = item.str;
                textDiv.style.position = 'absolute';
                textDiv.style.left = `${item.transform[4]}px`;
                textDiv.style.top = `${item.transform[5] - item.height}px`;
                textDiv.style.fontSize = `${item.height}px`;
                textDiv.style.fontFamily = item.fontName || 'sans-serif';
                textDiv.style.color = 'transparent';
                textDiv.style.cursor = 'text';
                textDiv.style.height = `${item.height}px`;
                textDiv.style.lineHeight = '1';
                textDiv.style.userSelect = 'text';
                textDiv.style.webkitUserSelect = 'text';
                textDiv.style.mozUserSelect = 'text';
                textDiv.style.msUserSelect = 'text';
                textLayerDiv.appendChild(textDiv);
            }
        });
    }

    pageDiv.appendChild(canvas);
    pageDiv.appendChild(textLayerDiv);
    pdfContainer.appendChild(pageDiv);
}

// 提取文本（优化格式）
async function extractText() {
    docText = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        docText += `\n\n========== 第 ${i} 页 ==========\n${pageText}`;
    }
}

// 缩放功能
async function changeZoom(delta) {
    scale = Math.max(0.5, Math.min(2.0, scale + delta));
    zoomLevel.textContent = Math.round(scale * 100) + '%';

    if (pdfDoc) {
        pdfContainer.innerHTML = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            await renderPage(i);
        }
    }
}

// 添加消息（并保存到历史）
function addMessage(role, content) {
    // 移除空状态提示
    const emptyState = chatMessages.querySelector('.text-center');
    if (emptyState) {
        emptyState.remove();
    }

    // 添加到 DOM
    const messageDiv = addMessageToDOM(role, content);

    // 保存到当前文件的对话历史
    if (currentFile && currentFile.path && role !== 'loading') {
        if (!chatHistories[currentFile.path]) {
            chatHistories[currentFile.path] = [];
        }
        chatHistories[currentFile.path].push({ role, content });

        // 保存到本地存储
        saveChatHistory(currentFile.path, chatHistories[currentFile.path]);
    }

    return messageDiv;
}

// 保存对话历史到本地
async function saveChatHistory(filePath, history) {
    if (!isElectron()) return;

    try {
        await window.electronAPI.saveChatHistory(filePath, history);
    } catch (error) {
        console.error('保存对话历史失败:', error);
    }
}

// 处理文本选择
function handleTextSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        selectedText = '';
        askSelectionBtn.classList.add('hidden');
        return;
    }

    const selected = selection.toString().trim();
    // 检查是否选择了文本层的内容
    if (selected && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;

        // 获取最近的元素节点
        let element = startContainer;
        while (element && element.nodeType !== Node.ELEMENT_NODE) {
            element = element.parentElement;
        }

        // 检查选择是否在文本层内
        const textLayer = element?.closest('.textLayer');
        if (textLayer) {
            selectedText = selected;
            // 定位按钮到选中文本区域附近
            positionAskButton(range);
            askSelectionBtn.classList.remove('hidden');
        } else {
            selectedText = '';
            askSelectionBtn.classList.add('hidden');
        }
    } else {
        selectedText = '';
        askSelectionBtn.classList.add('hidden');
    }
}

// 定位选中文本提问按钮
function positionAskButton(range) {
    try {
        const rect = range.getBoundingClientRect();
        const btnWidth = askSelectionBtn.offsetWidth;
        const btnHeight = askSelectionBtn.offsetHeight;

        // 默认计算位置（在选中文本的右侧）
        let left = rect.right + 10;
        let top = rect.top;

        // 检查是否超出右侧边界
        if (left + btnWidth > window.innerWidth) {
            // 放在左侧
            left = rect.left - btnWidth - 10;
        }

        // 检查是否超出上边界
        if (top < 10) {
            top = 10;
        }

        // 检查是否超出下边界
        if (top + btnHeight > window.innerHeight) {
            // 放在选中文本上方
            top = rect.top - btnHeight - 10;
        }

        // 如果还是超出，则放在安全位置
        if (left < 10) left = 10;
        if (top < 10) top = 10;
        if (left + btnWidth > window.innerWidth) left = window.innerWidth - btnWidth - 10;
        if (top + btnHeight > window.innerHeight) top = window.innerHeight - btnHeight - 10;

        askSelectionBtn.style.left = `${left}px`;
        askSelectionBtn.style.top = `${top}px`;
    } catch (error) {
        // 如果定位失败，使用默认位置
        askSelectionBtn.style.left = 'auto';
        askSelectionBtn.style.right = '20px';
        askSelectionBtn.style.top = '80px';
    }
}

// 检查是否点击了提问按钮
function askAskSelectionButton(target) {
    return target === askSelectionBtn || askSelectionBtn.contains(target);
}

// 发送消息
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    if (!window.appConfig.apiKey) {
        alert('请先在设置中配置 API Key');
        settingsBtn.click();
        return;
    }

    // 添加用户消息到历史
    if (currentFile && currentFile.path) {
        if (!chatHistories[currentFile.path]) {
            chatHistories[currentFile.path] = [];
        }
        chatHistories[currentFile.path].push({ role: 'user', content: text });
    }

    // 添加用户消息到 DOM
    addMessageToDOM('user', text);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // 清除选中文本状态
    selectedText = '';
    askSelectionBtn.classList.add('hidden');
    window.getSelection().removeAllRanges();

    // 保存历史
    if (currentFile && currentFile.path) {
        await saveChatHistory(currentFile.path, chatHistories[currentFile.path]);
    }

    // 显示加载状态
    const loadingMsg = addMessageToDOM('loading', '');

    try {
        const response = await callZhipuAPI(text);
        loadingMsg.remove();

        // 添加 AI 回复到历史
        if (currentFile && currentFile.path) {
            chatHistories[currentFile.path].push({ role: 'ai', content: response });
            await saveChatHistory(currentFile.path, chatHistories[currentFile.path]);
        }

        // 添加到 DOM
        addMessageToDOM('ai', response);
    } catch (error) {
        loadingMsg.remove();
        const errorMsg = '抱歉，调用 AI API 时出错：' + error.message;

        // 添加错误到历史
        if (currentFile && currentFile.path) {
            chatHistories[currentFile.path].push({ role: 'ai', content: errorMsg });
            await saveChatHistory(currentFile.path, chatHistories[currentFile.path]);
        }

        addMessageToDOM('ai', errorMsg);
    }
}

// 获取文档文本内容
async function getDocumentText(file) {
    // 检查缓存
    if (knowledgeBase[file.path] && knowledgeBase[file.path].text) {
        return knowledgeBase[file.path].text;
    }

    try {
        let fileData;
        // 检查文件内容缓存
        if (fileContents[file.path]) {
            fileData = fileContents[file.path];
        } else {
            // 从 Electron 读取文件
            const result = await window.electronAPI.readFile(file.path);
            if (result.success) {
                fileData = new Uint8Array(result.data);
                fileContents[file.path] = fileData;
            } else {
                throw new Error(result.error);
            }
        }

        // 根据文件类型提取文本
        let text = '';
        if (file.type === 'pdf') {
            const bufferCopy = fileData.buffer.slice(0);
            const uint8ArrayCopy = new Uint8Array(bufferCopy);
            const pdf = await pdfjsLib.getDocument({ data: uint8ArrayCopy }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                text += `\n\n========== 第 ${i} 页 ==========\n${pageText}`;
            }
        } else if (file.type === 'docx') {
            const bufferCopy = fileData.buffer.slice(0);
            const uint8ArrayCopy = new Uint8Array(bufferCopy);
            const result = await mammoth.convertToHtml({ arrayBuffer: uint8ArrayCopy });
            text = result.value;
        } else if (file.type === 'markdown' || file.type === 'text') {
            const decoder = new TextDecoder('utf-8');
            text = decoder.decode(fileData);
        }

        // 缓存文本
        knowledgeBase[file.path] = {
            name: file.name,
            type: file.type,
            text: text
        };

        return text;
    } catch (error) {
        console.error(`提取 ${file.name} 文本失败:`, error);
        return `[无法提取 ${file.name} 的内容: ${error.message}]`;
    }
}

// Token 预估（中文约 1 字符 = 1.5 tokens，英文约 1 字符 = 0.3 tokens）
function estimateTokens(text) {
    // 简化估算：中文字符 1.5 tokens，英文单词 0.5 tokens，其他字符 1 token
    let tokens = 0;
    let chineseChars = 0;
    let englishWords = 0;
    let otherChars = 0;

    // 检测中文字符
    const chinesePattern = /[\u4e00-\u9fa5]/g;
    chineseChars = (text.match(chinesePattern) || []).length;

    // 检测英文单词
    const englishPattern = /\b[a-zA-Z]+\b/g;
    englishWords = (text.match(englishPattern) || []).length;

    // 其他字符
    otherChars = text.length - chineseChars - englishWords;

    tokens = chineseChars * 1.5 + englishWords * 0.5 + otherChars;
    return Math.ceil(tokens);
}

// 智能截断文本（保留开头和结尾，中间用省略号）
function smartTruncate(text, maxTokens, label = '') {
    const estimatedTokens = estimateTokens(text);
    if (estimatedTokens <= maxTokens) {
        return text;
    }

    // 计算需要保留的比例
    const keepRatio = maxTokens / estimatedTokens * 0.9; // 留 10% 余量
    const keepLength = Math.floor(text.length * keepRatio);
    const splitPoint = Math.floor(keepLength / 2);

    const head = text.substring(0, splitPoint);
    const tail = text.substring(text.length - splitPoint);

    return `${head}\n\n...[${label}内容过长，已智能截断]...\n\n${tail}`;
}

// 调用智谱AI API（优化版本）
async function callZhipuAPI(question) {
    const apiUrl = window.appConfig.apiUrl;
    const apiKey = window.appConfig.apiKey;
    const modelName = window.appConfig.modelName;

    let systemPrompt = '';
    let useExamples = false;

    if (currentMode === 'single') {
        // 单文档模式：使用结构化的提示词
        const fileName = currentFile ? currentFile.name : '文档';
        const docContent = docText || '(文档文本尚未提取)';

        // 智能截断文档内容
        const maxDocTokens = TOKEN_LIMITS.MAX_SYSTEM_PROMPT_TOKENS - 500; // 留空间给提示词
        const truncatedDoc = smartTruncate(docContent, maxDocTokens, fileName);

        systemPrompt = SINGLE_DOC_PROMPT_TEMPLATE(fileName, truncatedDoc);
    } else {
        // 知识库模式
        if (knowledgeIndex.length === 0) {
            throw new Error('请先构建知识库索引');
        }

        showToast('正在分析问题并检索相关文档...');

        // 使用索引进行智能检索
        const relevantDocs = await findRelevantDocuments(question);

        // 构建索引摘要（作为备用上下文）
        const indexSummary = knowledgeIndex.map((doc, index) => {
            const keywordsStr = doc.keywords && doc.keywords.length > 0 ? `\n关键词: ${doc.keywords.join(', ')}` : '';
            return `[${index + 1}] ${doc.name}\n摘要: ${doc.summary}${keywordsStr}`;
        }).join('\n\n');

        if (relevantDocs.length === 0) {
            // 检索结果为空，使用索引摘要作为上下文
            systemPrompt = KNOWLEDGE_BASE_NO_DOCS_PROMPT_TEMPLATE(indexSummary, knowledgeIndex.length);
        } else {
            showToast(`已检索到 ${relevantDocs.length} 个相关文档`, 'info');

            // 智能加载相关文档内容（控制总 tokens）
            const maxDocsTokens = TOKEN_LIMITS.MAX_SYSTEM_PROMPT_TOKENS - 800; // 留空间给系统提示词
            const avgTokensPerDoc = Math.floor(maxDocsTokens / relevantDocs.length);

            let documentsText = '';
            for (const doc of relevantDocs) {
                showToast(`正在加载 ${doc.name}...`);
                const text = await getDocumentText(doc);
                const truncatedText = smartTruncate(text, avgTokensPerDoc, doc.name);
                documentsText += `\n\n========== ${doc.name} ==========\n${truncatedText}`;
            }

            const docNames = relevantDocs.map(doc => doc.name);
            systemPrompt = KNOWLEDGE_BASE_WITH_DOCS_PROMPT_TEMPLATE(docNames, documentsText);
            useExamples = true;
        }
    }

    // 构建 messages
    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    // 添加 few-shot 示例（仅在知识库模式且有相关文档时）
    if (useExamples) {
        messages.push(
            { role: 'user', content: FEW_SHOT_EXAMPLE.user },
            { role: 'assistant', content: FEW_SHOT_EXAMPLE.assistant }
        );
    }

    // 添加当前问题
    messages.push({ role: 'user', content: question });

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            max_tokens: TOKEN_LIMITS.MAX_OUTPUT_TOKENS,
            ...MODEL_PARAMS.DEFAULT,
            messages: messages
        })
    });

    // 先获取响应文本
    const responseText = await response.text();

    if (!response.ok) {
        try {
            const error = JSON.parse(responseText);
            throw new Error(error.error?.message || error.message || 'API 请求失败');
        } catch (e) {
            throw new Error(`API 请求失败 (${response.status}): ${responseText || '无响应内容'}`);
        }
    }

    // 尝试解析JSON
    try {
        const data = JSON.parse(responseText);
        return data.choices?.[0]?.message?.content || data?.message || '无法解析API响应';
    } catch (e) {
        console.error('JSON解析失败:', responseText);
        throw new Error(`API响应格式错误: ${e.message}`);
    }
}

// 关闭设置弹窗
function closeSettings() {
    settingsModal.classList.add('hidden');
}

// 初始化应用
async function init() {
    // 获取 DOM 元素
    fileTree = document.getElementById('file-tree');
    docContent = document.getElementById('doc-content');
    welcomeZone = document.getElementById('welcome-zone');
    pdfContainer = document.getElementById('pdf-container');
    markdownContainer = document.getElementById('markdown-container');
    docxContainer = document.getElementById('docx-container');
    pageInfo = document.getElementById('page-info');
    zoomIn = document.getElementById('zoom-in');
    zoomOut = document.getElementById('zoom-out');
    zoomLevel = document.getElementById('zoom-level');
    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    sendBtn = document.getElementById('send-btn');
    clearChat = document.getElementById('clear-chat');
    autoExtract = document.getElementById('auto-extract');
    askSelectionBtn = document.getElementById('ask-selection');
    modeSingle = document.getElementById('mode-single');
    modeKnowledge = document.getElementById('mode-knowledge');
    knowledgeStatus = document.getElementById('knowledge-status');
    knowledgeDocCount = document.getElementById('knowledge-doc-count');
    buildIndexBtn = document.getElementById('build-index-btn');
    indexStatus = document.getElementById('index-status');
    indexDocCount = document.getElementById('index-doc-count');
    settingsBtn = document.getElementById('settings-btn');
    settingsModal = document.getElementById('settings-modal');

    // 创建 Toast 容器
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    // 绑定事件
    bindEvents();

    // 加载设置
    await loadSettings();
}

// 绑定所有事件
function bindEvents() {
    // 模式切换
    modeSingle.addEventListener('click', () => switchMode('single'));
    modeKnowledge.addEventListener('click', (e) => {
        if (knowledgeFiles.length === 0) {
            showToast('请先选择文件夹以使用知识库模式', 'warning');
            return;
        }
        switchMode('knowledge');
    });

    // 构建索引按钮
    buildIndexBtn.addEventListener('click', async () => {
        if (isBuildingIndex) {
            showToast('索引正在构建中，请稍候...', 'warning');
            return;
        }

        if (knowledgeFiles.length === 0) {
            showToast('请先选择文件夹', 'warning');
            return;
        }

        isBuildingIndex = true;
        buildIndexBtn.disabled = true;
        buildIndexBtn.innerHTML = `
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            构建中...
        `;

        try {
            if (!window.appConfig.apiKey) {
                showToast('请先在设置中配置 API Key', 'warning');
                return;
            }

            // 辅助函数：获取相对路径
            const getRelativePath = (absolutePath, basePath) => {
                if (!absolutePath.startsWith(basePath)) return absolutePath;
                let relative = absolutePath.slice(basePath.length);
                if (relative.startsWith('/') || relative.startsWith('\\')) {
                    relative = relative.slice(1);
                }
                return relative;
            };

            // 辅助函数：获取绝对路径（将相对路径转为绝对）
            const getAbsolutePath = (relativePath, basePath) => {
                return basePath.replace(/[/\\]$/, '') + '/' + relativePath.replace(/\\/g, '/');
            };

            // 加载现有索引到 Map（使用绝对路径作为 key）
            const existingIndexMap = new Map();
            if (knowledgeIndex.length > 0) {
                knowledgeIndex.forEach(entry => {
                    const absolutePath = getAbsolutePath(entry.path, currentFolderPath);
                    existingIndexMap.set(absolutePath, entry);
                });
            }

            // 收集索引条目（从现有索引开始）
            const indexEntries = [...knowledgeIndex];
            let skippedCount = 0;
            let addedCount = 0;
            let updatedCount = 0;

            for (const file of knowledgeFiles) {
                const hashResult = await window.electronAPI.getFileHash(file.path);
                if (!hashResult.success) {
                    console.error(`获取 ${file.name} hash 失败:`, hashResult.error);
                    continue;
                }

                const currentHash = hashResult.hash;
                const existingEntry = existingIndexMap.get(file.path);

                // 检查是否需要处理
                if (existingEntry && existingEntry.hash === currentHash) {
                    // Hash 未变化，跳过
                    skippedCount++;
                    continue;
                }

                // 需要重新生成摘要（新增或已修改）
                showToast(`正在处理 ${file.name} (${existingEntry ? '更新' : '新增'})...`);

                try {
                    // 提取文档文档文本
                    const text = await getDocumentText(file);
                    // 调用大模型生成摘要和关键词
                    const { summary, keywords } = await generateDocumentSummary(text, file.name);

                    const newEntry = {
                        path: file.path,
                        name: file.name,
                        type: file.type,
                        summary: summary,
                        keywords: keywords
                    };

                    // 从现有索引中移除旧条目（通过相对路径匹配）
                    const relativePath = getRelativePath(file.path, currentFolderPath);
                    const oldIndex = indexEntries.findIndex(e => {
                        return e.path === file.path || e.path === relativePath;
                    });
                    if (oldIndex !== -1) {
                        indexEntries.splice(oldIndex, 1);
                        updatedCount++;
                    } else {
                        addedCount++;
                    }
                    indexEntries.push(newEntry);
                } catch (error) {
                    console.error(`索引 ${file.name} 失败:`, error);
                    // 即使失败也添加基本信息
                    const newEntry = {
                        path: file.path,
                        name: file.name,
                        type: file.type,
                        summary: '[摘要生成失败]',
                        keywords: []
                    };

                    const relativePath = getRelativePath(file.path, currentFolderPath);
                    const oldIndex = indexEntries.findIndex(e => {
                        return e.path === file.path || e.path === relativePath;
                    });
                    if (oldIndex !== -1) {
                        indexEntries.splice(oldIndex, 1);
                        updatedCount++;
                    } else {
                        addedCount++;
                    }
                    indexEntries.push(newEntry);
                }
            }

            showToast(`处理完成：新增 ${addedCount} 份，更新 ${updatedCount} 份，跳过 ${skippedCount} 份（未变化）`);

            // 调用 IPC 保存索引（传入 basePath）
            const ipcResult = await window.electronAPI.buildKnowledgeIndex(knowledgeFiles, indexEntries, currentFolderPath);
            if (!ipcResult.success) {
                throw new Error(ipcResult.error);
            }

            knowledgeIndex = indexEntries;

            // 更新索引状态
            indexStatus.classList.remove('hidden');
            indexDocCount.textContent = `已索引 ${knowledgeIndex.length} 份`;
            let message = `索引构建完成！已保存到 ${ipcResult.indexPath}`;
            if (ipcResult.deletedCount > 0) {
                message += `（已移除 ${ipcResult.deletedCount} 个不存在的文件）`;
            }
            showToast(message, 'success');

        } catch (error) {
            console.error('构建索引失败:', error);
            showToast(`构建索引失败: ${error.message}`, 'error');
        } finally {
            isBuildingIndex = false;
            buildIndexBtn.disabled = false;
            buildIndexBtn.innerHTML = `
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
                </svg>
                构建索引
            `;
        }
    });

    // 缩放按钮
    zoomIn.addEventListener('click', () => changeZoom(0.1));
    zoomOut.addEventListener('click', () => changeZoom(-0.1));

    // 选中文本提问按钮
    askSelectionBtn.addEventListener('click', () => {
        if (selectedText) {
            chatInput.value = `请解释这段文本：\n"${selectedText}"`;
            chatInput.focus();
            chatInput.disabled = false;
            sendBtn.disabled = false;
        }
    });

    // 发送消息
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 处理鼠标按下事件（隐藏按钮）
    document.addEventListener('mousedown', (e) => {
        // 如果点击的不是提问按钮本身，则隐藏按钮
        if (!askAskSelectionButton(e.target)) {
            askSelectionBtn.classList.add('hidden');
        }
    });

    // 处理鼠标释放事件（延迟检测选择）
    document.addEventListener('mouseup', (e) => {
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && !askAskSelectionButton(e.target)) {
                handleTextSelection();
            }
        }, 10);
    });

    // 清空对话
    clearChat.addEventListener('click', async () => {
        if (!currentFile || !currentFile.path) {
            showToast('请先选择一个文件', 'warning');
            return;
        }

        // 清空当前文件的对话历史
        chatHistories[currentFile.path] = [];
        renderChatHistory();

        // 删除本地存储的对话历史
        if (isElectron()) {
            try {
                await window.electronAPI.deleteChatHistory(currentFile.path);
                showToast('对话已清空', 'info');
            } catch (error) {
                console.error('删除对话历史失败:', error);
            }
        }
    });

    // 自动调整输入框高度
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // 打开设置弹窗
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    // 关闭设置弹窗
    const closeSettingsBtn = document.getElementById('close-settings');
    const cancelSettingsBtn = document.getElementById('close-settings-btn');

    closeSettingsBtn.addEventListener('click', closeSettings);
    cancelSettingsBtn.addEventListener('click', closeSettings);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettings();
        }
    });

    // 选择工作区按钮
    const selectWorkspaceBtn = document.getElementById('select-workspace-btn');
    selectWorkspaceBtn.addEventListener('click', async () => {
        if (isElectron()) {
            const result = await window.electronAPI.selectFolder();
            if (result && result.folderPath) {
                document.getElementById('workspace-path').value = result.folderPath;
            }
        } else {
            alert('文件夹选择功能仅在 Electron 环境中可用');
        }
    });

    // 保存设置
    const saveSettingsBtn = document.getElementById('save-settings');
    saveSettingsBtn.addEventListener('click', async () => {
        const apiKeyInput = document.getElementById('api-key');
        const apiUrlInput = document.getElementById('api-url');
        const modelNameInput = document.getElementById('model-name');
        const workspacePathInput = document.getElementById('workspace-path');

        const apiKey = apiKeyInput.value.trim();
        const apiUrl = apiUrlInput.value.trim();
        const modelName = modelNameInput.value.trim();
        const workspacePath = workspacePathInput.value.trim();

        // 使用批量保存配置
        if (window.electronAPI) {
            try {
                await window.electronAPI.saveConfig({
                    'zhipu': apiKey,
                    'api-url': apiUrl,
                    'model-name': modelName,
                    'workspace-path': workspacePath
                });
            } catch (error) {
                showToast('保存配置失败: ' + error.message, 'error');
                return;
            }
        }

        // 更新本地状态
        window.appConfig = {
            apiKey: apiKey,
            apiUrl: apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            modelName: modelName || 'glm-4.7-flash',
            workspacePath: workspacePath
        };

        showToast('设置已保存', 'success');

        // 如果工作区路径改变，重新加载
        if (workspacePath && workspacePath !== currentFolderPath) {
            await loadWorkspaceFolder(workspacePath);
        }

        closeSettings();
    });
}

// 加载设置
async function loadSettings() {
    if (window.electronAPI) {
        const apiKey = await window.electronAPI.loadAPIKey('zhipu');
        const apiUrl = await window.electronAPI.loadAPIKey('api-url');
        const modelName = await window.electronAPI.loadAPIKey('model-name');
        const workspacePath = await window.electronAPI.loadAPIKey('workspace-path');

        const apiKeyInput = document.getElementById('api-key');
        const apiUrlInput = document.getElementById('api-url');
        const modelNameInput = document.getElementById('model-name');
        const workspacePathInput = document.getElementById('workspace-path');

        if (apiKey) apiKeyInput.value = apiKey;
        if (apiUrl) apiUrlInput.value = apiUrl;
        if (modelName) modelNameInput.value = modelName;
        if (workspacePath) workspacePathInput.value = workspacePath;

        window.appConfig = {
            apiKey: apiKey || '',
            apiUrl: apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            modelName: modelName || 'glm-4',
            workspacePath: workspacePath || ''
        };

        // 如果有工作区路径，自动加载
        if (workspacePath) {
            await loadWorkspaceFolder(workspacePath);
        }
    } else {
        window.appConfig = {
            apiKey: '',
            apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            modelName: 'glm-4',
            workspacePath: ''
        };
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', init);
