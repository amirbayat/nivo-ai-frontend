import { LegalLayout } from './LegalLayout'
import { LEGAL } from './legalContent'

export function IntlDataDeletionPage() {
  return (
    <LegalLayout title="Data Deletion">
      <p>
        You can have the data Nivo Smart DM stores about your connected Instagram account deleted at any time, in two ways:
      </p>

      <h2>1. Disconnect from the app (instant)</h2>
      <p>
        Open the Service, go to the Instagram connection page, and disconnect your account. This immediately deletes:
      </p>
      <ul>
        <li>your automation rules (keywords and reply text you configured),</li>
        <li>the record of people who have commented, messaged, or replied to your stories through the connected account,</li>
        <li>your stored Instagram access token.</li>
      </ul>

      <h2>2. Remove the app from Instagram/Facebook settings</h2>
      <p>
        If you remove Nivo Smart DM from your Instagram or Facebook app settings, Meta notifies us automatically and we
        delete the same data described above without any further action from you.
      </p>

      <h2>3. Ask us directly</h2>
      <p>
        You can also email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> from the address linked to your
        account and we will delete the data manually.
      </p>

      <p>
        Deleting your data stops all automated replies and cannot be undone. It does not delete your Instagram account
        itself, which is managed entirely by Meta.
      </p>
    </LegalLayout>
  )
}
