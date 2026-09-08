import { ModelPickerModal, type ModelPickerItem } from '@/components/models/ModelPickerModal'
import type { KieVideoModel } from '@/types/api'

// همون مدال مشترک انتخاب مدل که video-studio/image-studio استفاده می‌کنند (نه دراپ‌دون کوچک).
// عمداً provider (Kie.ai/OpenRouter) نشون داده نمی‌شه — این یه جزئیات پیاده‌سازی داخلیه، نه
// چیزی که کاربر باید روش تصمیم بگیره؛ به‌جاش فقط امکانات واقعی مدل (عکس/ویدیو/ادیت/رزولوشن) دیده می‌شه.
function GenericModelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#6ee7b7">
      <path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4L12 2z" />
    </svg>
  )
}

function blurbFor(m: KieVideoModel): string {
  if (m.supportsScenePreservingEdit) {
    return 'می‌تونه یه ویدیوی موجود رو ویرایش کنه (بقیه‌ی صحنه دست‌نخورده می‌مونه) یا از یه رفرنس برات بسازه'
  }
  if (m.supportsVideo) return 'از یه ویدیوی مرجع برای سبک/حرکت الهام می‌گیره و یه ویدیوی تازه می‌سازه'
  if (m.supportsImages) return 'از پرامپت و عکس مرجع یه ویدیوی تازه می‌سازه'
  return 'فقط از روی توضیح متنی یه ویدیو می‌سازه'
}

function chipsFor(m: KieVideoModel): string[] {
  const chips: string[] = []
  if (m.supportsImages) chips.push(`عکس تا ${m.maxImages ?? '؟'}`)
  if (m.supportsVideo) chips.push(m.supportsScenePreservingEdit ? 'ادیت ویدیو' : 'ویدیوی مرجع')
  if (m.resolutions.length) chips.push(m.resolutions.join(' / '))
  return chips
}

function toItem(m: KieVideoModel): ModelPickerItem {
  return {
    key: m.id,
    icon: <GenericModelIcon />,
    name: m.displayName,
    blurb: blurbFor(m),
    chips: chipsFor(m),
  }
}

export function VideoEditModelPickerModal({
  open,
  onClose,
  models,
  selectedId,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  models: KieVideoModel[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <ModelPickerModal
      open={open}
      onClose={onClose}
      items={models.map(toItem)}
      selectedKey={selectedId}
      onSelect={onSelect}
      title="انتخاب مدل ویدیو"
      subtitle="هر مدل رو با امکاناتش ببین و انتخاب کن"
    />
  )
}
