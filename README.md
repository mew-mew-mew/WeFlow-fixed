# WeFlow Fixed

Windows x64 的 WeFlow 5.0.0 社区修复分支，处理旧版数据库组件到期导致的 `-101` 初始化错误，以及 WeLive 过期造成的导出失败。

**非官方版本，仅验证 Windows x64。** 修复了两处期限检查，其他闭源组件与全部业务功能尚未逐项验证。

## 下载

前往 [Releases](https://github.com/mew-mew-mew/WeFlow-fixed/releases) 下载 `WeFlow-5.0.0-fixed.3-Setup.exe`。
同一发布中提供 SHA256SUMS.txt，可用 PowerShell 的 `Get-FileHash` 核对下载文件。

要求：Windows 10 或更高版本、x64；上游声明支持电脑版微信 4.0 及以上，具体版本兼容性仍需自行验证。

## 本分支改了什么

- 同名会话自动使用独立文件名和会话目录，已有 JSON 属于其他会话时不会被覆盖。
- 批量导出显示真实成功与失败数量，可展开失败会话原因；结束后不再保留最后一个会话的消息进度。

- WeLive 明确返回 `this build has expired` 且全部导出失败时，自动使用内置兼容导出流程；保留原有崩溃回退，其他错误仍按原样报告。
- 两处读取组件截止时间由 2026 年延长至 2037 年，总计修改 4 个字节。
- 保留原始组件哈希、修复后哈希、字节位置和可复现的带校验脚本。
- 将上游定时和自动发布工作流归档为文本，避免发布未验证的平台版本。
- 版本号标记为 `5.0.0-fixed.3`。

参见 [修复范围、证据和验证记录](docs/windows-expiry-fix.md)。
这次修复未修改系统时间、微信程序或聊天数据。发布内容仅含应用代码、组件和构建产物。

## 从源码构建

安装 Git 和 Node.js 24：

```powershell
git clone https://github.com/mew-mew-mew/WeFlow-fixed.git
cd WeFlow-fixed
npm ci
node node_modules/electron/install.js
node scripts/prepare-electron-runtime.cjs
npm run build -- --win --x64 --publish never
```

安装包生成在 `release/`。新版 npm 可能默认阻止依赖安装脚本，请核查构建所需的 Electron、esbuild 和 ffmpeg-static 安装步骤。

## 来源与许可

本项目基于 [jacklilyhello/WeFlow](https://github.com/jacklilyhello/WeFlow)，
原项目为 [hicccc77/WeFlow](https://github.com/hicccc77/WeFlow)。
原始说明保存在 [README-upstream.md](README-upstream.md)。保留上游作者和来源标注。

遵循上游 [CC BY-NC-SA 4.0](LICENSE) 许可，仅限非商业使用并按相同许可分享。
