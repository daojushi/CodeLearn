#!/usr/bin/env node
/**
 * electron 启动包装器。
 *
 * 某些环境会注入 ELECTRON_RUN_AS_NODE=1(使 electron.exe 以纯 Node 模式运行,
 * 主进程里 require('electron') 拿不到 app 等 API,直接崩溃)。
 * 该变量只影响本进程树,不属于系统设置 —— 这里在 spawn 前将其移除。
 */
delete process.env.ELECTRON_RUN_AS_NODE

const { spawn } = require('node:child_process')

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  console.error('usage: node scripts/launch.cjs <command> [args...]')
  process.exit(1)
}

const child = spawn(cmd, args, { stdio: 'inherit', shell: true })
child.on('exit', (code, signal) => {
  if (code === null) {
    console.error(`launch: ${cmd} exited with signal ${signal}`)
    process.exit(1)
  }
  process.exit(code)
})
