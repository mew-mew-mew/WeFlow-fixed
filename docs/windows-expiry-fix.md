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
尤其是 WeLive 导出引擎等其他闭源组件可能存在独立期限，本修复未覆盖。

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

## 构建与工作流

版本标记为 `5.0.0-fixed.1`。上游的自动发布、定时构建和其他工作流已移至
`docs/upstream-workflows/` 作为文本保存，避免新仓库自动发布未验证的平台构建。
