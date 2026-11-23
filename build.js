// 构建脚本：把 src/ 合成为自包含单文件 index.html（离线可用，供 WebView 打包）
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');

let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
const jsDir = path.join(srcDir, 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => /^\d{2}-.*\.js$/.test(f)).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');

html = html.replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + css + '\n</style>');
const jsStart = html.indexOf('<!-- JS 模块');
const jsEndMark = html.indexOf('<!-- /JS 模块');
if (jsStart >= 0 && jsEndMark >= 0){
  const jsEnd = html.indexOf('-->', jsEndMark) + 3;
  html = html.slice(0, jsStart) + '<!-- JS 模块（构建时拼接为单个 <script>） -->\n<script>\n' + js + '\n</script>\n' + html.slice(jsEnd);
}

const out = path.join(root, 'index.html');
fs.writeFileSync(out, html);
console.log('OK -> index.html (' + Buffer.byteLength(html) + ' bytes)');