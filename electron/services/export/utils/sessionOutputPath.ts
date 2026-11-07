import * as path from 'node:path'
import { open } from 'node:fs/promises'

async function existingJsonOwner(filePath: string): Promise<string | null> {
  if (path.extname(filePath).toLowerCase() !== '.json') return null
  let file
  try {
    file = await open(filePath, 'r')
    const buffer = Buffer.alloc(64 * 1024)
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0)
    const match = /"session"\s*:\s*\{\s*"wxid"\s*:\s*("(?:\\.|[^"\\])*")/.exec(buffer.subarray(0, bytesRead).toString('utf8'))
    return match ? JSON.parse(match[1]) : null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  } finally {
    await file?.close()
  }
}

export async function reserveSessionOutputPath(
  preferredPath: string,
  sessionId: string,
  reservations: Map<string, string>,
  separateSessionFolder = false
): Promise<string> {
  const directory = path.dirname(preferredPath)
  const extension = path.extname(preferredPath)
  const base = path.basename(preferredPath, extension)
  const suffix = sessionId.replace(/[^\p{L}\p{N}_@.-]/gu, '_') || 'session'
  for (let attempt = 0; attempt < 10000; attempt++) {
    const extra = attempt === 0 ? '' : `_${suffix}${attempt > 1 ? `_${attempt}` : ''}`
    const candidateDirectory = extra && separateSessionFolder
      ? path.join(path.dirname(directory), path.basename(directory) + extra)
      : directory
    const candidate = path.join(candidateDirectory, `${base}${extra}${extension}`)
    const key = process.platform === 'win32' ? path.resolve(candidate).toLowerCase() : path.resolve(candidate)
    const reserved = reservations.get(key)
    if (reserved && reserved !== sessionId) continue
    const existingOwner = await existingJsonOwner(candidate)
    // Recheck after I/O: another concurrent session may have reserved the path.
    const currentOwner = reservations.get(key)
    if (currentOwner && currentOwner !== sessionId) continue
    if (existingOwner && existingOwner !== sessionId) {
      reservations.set(key, existingOwner)
      continue
    }
    reservations.set(key, sessionId)
    return candidate
  }
  throw new Error('无法为同名会话分配独立导出路径')
}
