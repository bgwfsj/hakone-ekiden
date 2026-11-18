// 构建脚本：把 src/ 合成为自包含单文件 index.html（离线可用，供 WebView 打包）
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');

let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(srcDir, 'app.js'), 'utf8');

html = html.replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + css + '\n</style>');
html = html.replace('<script src="app.js"></script>', () => '<script>\n' + js + '\n</script>');

const out = path.join(root, 'index.html');
fs.writeFileSync(out, html);
console.log('OK -> index.html (' + Buffer.byteLength(html) + ' bytes)');