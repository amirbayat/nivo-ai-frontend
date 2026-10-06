import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { default as DatePicker } from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import persian_fa from 'react-date-object/locales/persian_fa'

function Test() {
  const [expiresAt, setExpiresAt] = useState('')
  return (
    <div>
      <p id="status">rendered-ok</p>
      <DatePicker
        calendar={persian}
        locale={persian_fa}
        editable={false}
        value={expiresAt ? new Date(expiresAt) : ''}
        onChange={(date: any) => setExpiresAt(date ? date.toDate().toISOString() : '')}
        placeholder="test"
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Test />
  </StrictMode>,
)
