import { useNavigate, useParams } from 'react-router-dom'
import { ConversationChat } from '@/components/seller/ConversationChat'

// docs/PRD-seller-panel-simplification.md §4.9 — گفتگوی مشتری تمام‌صفحه؛ بازگشت به لیست «گفتگوها»
export function SellerChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  if (!conversationId) return null
  return <ConversationChat conversationId={conversationId} onBack={() => navigate('/seller/panel/chats')} />
}
