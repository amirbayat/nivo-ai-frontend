import { useMemo } from 'react'
import { useDiscoveryCatalog } from '@/queries/discovery.queries'

// کاتالوگ دیسکاوری (/v2/discovery/catalog) عمومی است — بدون نیاز به لاگین هم جواب می‌دهد
// (discovery-public.controller.ts سمت بک‌اند)، پس این هوک برای صفحه‌ی خالی چت هم برای
// کاربر لاگین‌کرده (ChatPage) و هم کاربر مهمان (AnonChatPage) یکسان کار می‌کند
export function useTrendingImagePrompts(limit = 4) {
  const { data, isLoading } = useDiscoveryCatalog({ outputType: 'IMAGE', sort: 'newest' })
  const items = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => Number(b.isTrending) - Number(a.isTrending)).slice(0, limit)
  }, [data, limit])
  return { items, isLoading }
}
