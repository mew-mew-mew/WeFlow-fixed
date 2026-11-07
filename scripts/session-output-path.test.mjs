import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const compiled = await build({entryPoints: [fileURLToPath(new URL('../electron/services/export/utils/sessionOutputPath.ts', import.meta.url))], bundle:true, write:false, platform:'node',format:'esm'})
const { reserveSessionOutputPath } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)

async function removeTestDirectory(root) {
  assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()))
  assert.match(path.basename(root),/^weflow-(path|owner|folder)-test-/)
  await rm(root,{recursive:true,force:true})
}

test('concurrent sessions with identical names receive different paths', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'weflow-path-test-'));t.after(()=>removeTestDirectory(root))
  const preferred=path.join(root,'same.json');const reservations=new Map()
  const paths=await Promise.all(['test-a','test-b'].map(id=>reserveSessionOutputPath(preferred,id,reservations)))
  assert.notEqual(paths[0],paths[1])
  assert.equal(await reserveSessionOutputPath(preferred,'test-a',reservations),paths[0])
})

test('a previous JSON belonging to another session is preserved across runs', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'weflow-owner-test-'));t.after(()=>removeTestDirectory(root))
  const preferred=path.join(root,'same.json');const original=JSON.stringify({session:{wxid:'test-a'},messages:[]})
  await writeFile(preferred,original)
  assert.equal(await reserveSessionOutputPath(preferred,'test-a',new Map()),preferred)
  const other=await reserveSessionOutputPath(preferred,'test-b',new Map())
  assert.notEqual(other,preferred)
  assert.equal(await readFile(preferred,'utf8'),original)
})

test('duplicate names also separate their session folders and media locations', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'weflow-folder-test-'));t.after(()=>removeTestDirectory(root))
  const dir=path.join(root,'same');await mkdir(dir)
  const preferred=path.join(dir,'same.json');await writeFile(preferred,JSON.stringify({session:{wxid:'test-a'}}))
  const other=await reserveSessionOutputPath(preferred,'test-b',new Map(),true)
  assert.notEqual(path.dirname(other),dir)
  assert.equal(path.dirname(path.dirname(other)),root)
})
