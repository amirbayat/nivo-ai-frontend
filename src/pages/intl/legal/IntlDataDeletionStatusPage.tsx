import { useSearchParams } from 'react-router-dom'
import { LegalLayout } from './LegalLayout'

// این صفحه دقیقاً همان `url` است که `instagram.controller.ts#dataDeletion` در پاسخ به Meta
// برمی‌گرداند (`https://nivoai.site/data-deletion-status?code=...`). چون حذف در همان لحظه‌ی
// callback به‌صورت sync انجام می‌شود (instagram.service.ts#deleteStoreInstagramData)، این صفحه
// فقط کد را echo می‌کند — نیازی به lookup جدا در دیتابیس نیست.
export function IntlDataDeletionStatusPage() {
  const [params] = useSearchParams()
  const code = params.get('code')

  return (
    <LegalLayout title="Data Deletion Status">
      {code ? (
        <p>
          Your data deletion request (confirmation code <strong>{code}</strong>) has been completed. The automation rules,
          Instagram interaction records, and access token tied to that account have been removed.
        </p>
      ) : (
        <p>No confirmation code was provided.</p>
      )}
    </LegalLayout>
  )
}
