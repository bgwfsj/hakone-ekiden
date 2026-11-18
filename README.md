# 英子の箱根驿传

记录从 0 开始、跑向「1 小时完成 10 公里」的纯前端跑步 App（HTML → Android APK 壳）。

## 功能
- 首页顶部随机刷新知名跑者名言（每 25 秒自动换一句，轻触卡片也可换）
- 记录：默认当前时间、可选时间，输入距离与时长，自动换算配速；感受可不填（上限 100 字）
- 统计：总次数、总距离、总时长、平均配速
- 目标：终极目标「一小时十公里」——单次跑完 10 km 且配速 ≤ 6'00"
  - 单次含金量 = 距离达成 × 配速达成
  - 距离达成 = min(100%, 本次距离 ÷ 10 km)
  - 配速达成 = 6'00"→100%、8'00"→0% 线性换算（每快 30 秒 +25%）
  - 综合进度 = 历史所有记录里单次含金量的最高值（想涨只能跑出更远/更快的新记录）
  - 主进度条下另有一条细条显示「上一次」跑步的含金量作参考
  - 卡片右上角「?」按钮：弹框说明进度计算方法
- 日历：跑步的日子显示蓝色圆点；点日期看当天记录，点记录可修改、可删除
- 菜单（⋮）：检查更新、备份存档、关于

## 结构
```
src/index.html   模板（开发预览直接打开本文件即可）
src/style.css    样式（airy-minimal-ui 风格）
src/app.js       业务逻辑
build.js         构建脚本（无依赖，node build.js）
index.html       构建产物：自包含单文件，离线可用
_qa/cdp_qa.mjs   无头浏览器回归测试（Edge CDP）
_qa/pixels.mjs   截图像素校验
HakoneApp/       Android WebView 壳工程（包名 com.yingzi.hakone）
_tools/          gen-icons / build-release / verify / setup-gradle 脚本
```

数据保存在浏览器 localStorage（key: `hakone_records_v1`）；安卓版另有原生备份到 `backups/` 目录。

## 构建网页
```
node build.js
```
每次修改 `src/` 后重新构建，产物 `index.html` 即 APK 的 WebView 离线页面。

## 回归测试
```
node _qa/cdp_qa.mjs
```
需要本机安装 Microsoft Edge（CDP 无头模式），验证记录/修改/删除/日历/统计/目标含金量等核心逻辑。

## 打包 APK
前置：JDK 17、Android SDK（build-tools 34.0.0）、Gradle 8.5。
```
powershell -NoProfile -ExecutionPolicy Bypass -File _tools/build-release.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File _tools/verify.ps1
```
- 构建脚本会自动把工程镜像到 ASCII 路径 `E:\hakone_build\HakoneApp` 再编译（AGP 不支持中文路径），产物拷回根目录 `箱根驿传-vX.Y.Z.apk` 与 `箱根驿传.apk`
- verify 校验：包内页面与根 index.html 一致、签名证书、版本号
- 图标：根目录 `图标.png` → `_tools/gen-icons.ps1` 生成全套 mipmap + 自适应图标 + 通知小图标

## 在线更新与备份
- 打开 App 约 1.5 秒后自动检查 GitHub Releases 最新版；有新版本先自动备份存档（只保留最近 2 份，多的清理），再下载安装
- 更新包下载：通知栏进度 → SHA-256 校验（读取 Release 附件的 digest）→ FileProvider 唤起系统安装器
- 菜单里可手动「检查更新」与「备份存档」
- 更新仓库地址在 `HakoneApp/app/src/main/java/com/yingzi/hakone/Updater.java` 的 `OWNER` / `REPO`

## 发版流程
```
git add -A && git commit -m "v1.0.0"
git tag v1.0.0 && git push origin main --tags
gh release create v1.0.0 bu-1.0.0.apk --notes "..."
```
- Release 附件用 **ASCII 文件名**（如 `bu-1.0.0.apk`）：中文附件名会被 GitHub 截断，影响更新下载
- 升级版本要同步 4 处：`HakoneApp/app/build.gradle`（versionCode/versionName）、`src/app.js`（APP_VERSION/APP_CHANGELOG）、`_qa/cdp_qa.mjs` 断言、本 README

## 安全
- 签名密钥 `HakoneApp/app/keystore/hakone-release.jks` 与 `signing.properties` **严禁提交**（.gitignore 已覆盖）
- 证书 SHA-256：`15a630ce5b4b368e86e1fc12e18c4bc8459d99972b621b28f49981231760d09e`（永久不变）