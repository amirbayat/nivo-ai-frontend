import { COST_OPTIMIZED_MODE } from '@/lib/model-catalog'
import type { ModelCatalogEntry } from '@/queries/plans.queries'

export const DOC_EXTENSIONS = [
  'pdf', 'docx', 'xlsx', 'txt', 'md', 'csv', 'js', 'jsx', 'ts', 'tsx', 'py',
  'json', 'html', 'css', 'java', 'c', 'cpp', 'go', 'rb', 'php', 'sh', 'yaml', 'yml', 'xml', 'sql',
]

export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mpeg', 'mpg']
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac']

const DOC_ACCEPT = DOC_EXTENSIONS.map(e => `.${e}`).join(',')
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/mpeg,.mp4,.webm,.mov,.mpeg,.mpg'
const AUDIO_ACCEPT = 'audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/aac,audio/flac,.mp3,.wav,.m4a,.ogg,.aac,.flac'

export function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
}

export type AttachmentKind = 'image' | 'doc' | 'video' | 'audio' | 'unknown'

export function classifyAttachment(file: File): AttachmentKind {
  if (file.type.startsWith('image/') || /\.hei[cf]$/i.test(file.name)) return 'image'
  const ext = extOf(file.name)
  if (VIDEO_EXTENSIONS.includes(ext) || file.type.startsWith('video/')) return 'video'
  if (AUDIO_EXTENSIONS.includes(ext) || file.type.startsWith('audio/')) return 'audio'
  if (DOC_EXTENSIONS.includes(ext)) return 'doc'
  return 'unknown'
}

export function modelInputCaps(
  selectedModel: string | null | undefined,
  catalog: ModelCatalogEntry[] | undefined,
): { vision: boolean; video: boolean; audio: boolean; webSearch: boolean } {
  const chat = (catalog ?? []).filter(m => m.modelType === 'CHAT' && !m.supportsImageGen)
  const isAuto = !selectedModel || selectedModel === COST_OPTIMIZED_MODE
  if (isAuto) {
    return {
      vision: chat.some(m => m.supportsVision),
      video: chat.some(m => m.supportsVideoInput),
      audio: chat.some(m => m.supportsAudioInput),
      webSearch: chat.some(m => m.supportsWebSearch),
    }
  }
  const entry = chat.find(m => m.name === selectedModel)
  return {
    vision: Boolean(entry?.supportsVision),
    video: Boolean(entry?.supportsVideoInput),
    audio: Boolean(entry?.supportsAudioInput),
    webSearch: Boolean(entry?.supportsWebSearch),
  }
}

export function composerAccept(caps: { video: boolean; audio: boolean }): string {
  const parts = [`image/*,${DOC_ACCEPT}`]
  if (caps.video) parts.push(VIDEO_ACCEPT)
  if (caps.audio) parts.push(AUDIO_ACCEPT)
  return parts.join(',')
}
