# CodeLearn

以 Problem 为核心的个人学习与复习系统 —— 把做过的题转化为长期知识。

> **Capture → Connect → Reflect → Review**

## 功能

- **Capture**:新建题目十几秒完成 —— 标题 + Ctrl+V 粘贴文字/截图,补上 Rank / 知识点 / 状态
- **Problems**:搜索标题,按 Rank / Status / 知识点 / 错误原因筛选;行内直接下拉改 Rank(评级随阶段感受随时可调)
- **Connect**:知识点(Knowledge Point)自动双向关联 —— 题目 ↔ 知识点详情互相跳转;错误原因、多语言题解均可沉淀
- **Reflect**:灵感启迪、备注支持 **Markdown**(代码围栏、表格均可);题解代码按语言语法高亮
- **Review**:Today 到期队列 + 复习弹层(先回忆、后看答案),四档反馈(忘了 / 有点难 / 会了 / 轻松)按 1→3→7→14→30 天间隔自动排下一次复习,历史全程可查

## 使用

- **日常打开**:双击项目根目录 `启动CodeLearn.bat`(自动构建并启动),或命令行 `npm start`
- **数据位置**:默认 `%APPDATA%\CodeLearn`(数据库 `codelearn.db` + `images/`);可在 **Settings → 数据位置** 改存到其它磁盘(自动迁移,旧文件保留)
- **备份/换机**:Settings → 备份 —— 导出为单个 JSON(含全部数据与截图),在另一台电脑上导入即可恢复(导入前自动保留旧数据)
- 数据不随应用卸载而删除;删除应用后数据仍在原位置

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 开发模式(热更新)
npm run typecheck    # 双 tsconfig 类型检查
npm run dist         # 打包 Windows 安装程序 → release/
```

## 技术栈

Electron + electron-vite + React + TypeScript + Tailwind CSS v4 + SQLite+ react-router(Hash)+ highlight.js / react-markdown。




