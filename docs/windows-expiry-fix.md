# Windows x64 组件到期修复

本分支基于 [jacklilyhello/WeFlow](https://github.com/jacklilyhello/WeFlow) 的提交
`e5b7067aa0554151d2762c6f889dd47bc1bf2f46`，原项目为
[hicccc77/WeFlow](https://github.com/hicccc77/WeFlow)。保留上游 CC BY-NC-SA 4.0 许可与作者信息。

## 问题与范围

本次验证的 Windows x64 `wcdb_api.dll` 内置两处到期检查。
`InitProtection` 在 2026-09-30 23:59:59 UTC 后返回 `-101`；
`wcdb_init` 另构造同日期的本地时间并比较当前时间。
本修复把两处年份/期限延长至 2037 年，保留比较指令和其他逻辑。
没有更改系统时间、微信程序、聊天数据库、账号密钥或用户配置。

这不是官方发布版本。本次只验证 Windows x64，不保证其他架构或功能可用。
WeLive 导出引擎存在独立期限。自 fixed.2 起，应用遇到其明确的过期错误会切换至内置兼容导出流程；不修改 WeLive 二进制本身。其他组件及全部媒体功能尚未逐项验证。

## 可核验的变更

文件：`resources/wcdb/win32/x64/wcdb_api.dll`，大小 1,387,008 字节。

原始 SHA-256：`6397760da70de8062829fbe6a2ec01cf0616d6f2b334e6fe54873898f38f7ad7`

修复后 SHA-256：`74c96063fe619a84c9ab665c7d7d4fcf4ea1def866ea5197b407983a858bf175`

| 文件偏移 | 原值 | 修复值 | 含义 |
|---|---|---|---|
| `0x80DC1` | `7F A2 BD 6A` | `7F CD 6E 7F` | InitProtection 截止时间戳 |
| `0xE858D` | `7E 00 00 00` | `89 00 00 00` | wcdb_init 的 tm_year：126 → 137 |

总计改变 4 个字节。偏移仅适用于上述完整 SHA-256 匹配的原文件。

## 复现与验证

仓库已经包含修复后的 DLL。若需从原始 DLL 复现：

```powershell
python scripts/fix-wcdb-expiry.py ORIGINAL.dll REPAIRED.dll
```

脚本要求原始文件哈希和相邻指令均匹配，只创建新文件，拒绝覆盖输入和已有输出。

2026-11-07 在 Windows 10 x64、Node.js 24.22.1、Electron 43.0.0 环境验证：

- 原始组件：`InitProtection=-101`。
- 修复组件：通过 WeFlow.exe 作为 Electron/Node 宿主加载，
  `InitProtection=0`、`wcdb_init=0`、`wcdb_shutdown=0`。
- 已对修复组件进行完整 SHA-256 校验。
- 尚未对所有聊天读取、导出、朋友圈和媒体功能逐项验证。

参考社区问题：[hicccc77/WeFlow#1222](https://github.com/hicccc77/WeFlow/issues/1222)。
不同报告中的 DLL 可能不同，不能直接套用其偏移。

## 恢复

替换已安装组件前请退出 WeFlow 并备份原 DLL。需要撤回时，退出 WeFlow 后恢复备份即可；原文件的到期行为也会恢复。

## fixed.2：WeLive 过期时使用兼容导出

消息导出原本只在 WeLive 原生访问冲突时切换到应用已有的兼容流程。
WeLive 返回 `this build has expired` 时，导出任务会直接失败。

现在会在明确的过期错误、且本次没有成功导出会话时使用兼容流程。
普通错误及部分成功的过期结果仍按原结果报告，避免重新运行已成功的任务。
原有的原生崩溃回退保持原样。联系人导出不受影响。

`electron/services/weliveFallback.ts` 统一判断回退原因；
`scripts/welive-fallback.test.mjs` 覆盖过期错误、普通错误、部分成功、成功结果和已有崩溃码。
运行 `npm run test:welive-fallback` 可执行三个回归测试。

2026-11-07 已验证真实会话的完整 JSON 文本导出链路：识别过期错误、进入兼容流程、生成 JSON 并解析成功。
同时验证安装后 `exportWorker.js` 与构建产物一致。媒体及其他格式尚未逐项验证。

## 构建与工作流

版本标记为 `5.0.0-fixed.3`。上游的自动发布、定时构建和其他工作流已移至
`docs/upstream-workflows/` 作为文本保存，避免新仓库自动发布未验证的平台构建。


## fixed.3：批量导出的最终结果

批量接口的 success 表示至少有一个会话成功，并不保证全部成功。此前界面直接使用该值显示“已完成”，又将最终进度合并到最后一次会话进度，因而会出现“已完成 / 导出失败 0 / N 条”的矛盾显示。

现在依据 successCount 和 failCount 显示批次结果。部分失败明确标为“部分失败”，显示成功和失败的会话数，并可展开各失败会话的名称及错误原因。结束后清除上个会话的消息计数，改为显示整个批次的会话进度。自动导出的最终状态采用同一结果判断。

新增三个回归测试：部分成功不能当作全部成功、最终结果清除残留消息进度、致命错误和停止状态不误报成功。运行 `npm run test:export-task-result`。


### 同名会话的文件保护

原有经典文件名只使用显示名称；两个同名会话可能写到同一文件。现在为同一批次保留会话路径所有权，并检查已有详细 JSON 的 session.wxid。遇到其他会话已占用的名字，会追加账号标识，独立分配会话文件夹及媒体位置。属于当前会话的路径仍可按原冲突策略更新。已有输出不会为清理命名冲突而删除。

新增并发同名分配、已有其他会话 JSON 保护和独立媒体目录三个回归测试。运行 `npm run test:session-output-path`。
