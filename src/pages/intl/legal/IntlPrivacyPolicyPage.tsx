import { LegalLayout } from './LegalLayout'
import { LEGAL } from './legalContent'

export function IntlPrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how {LEGAL.companyName} (&quot;we&quot;, &quot;us&quot;) collects, uses, and
        protects information through Nivo Smart DM (the &quot;Service&quot;), a tool that lets Instagram sellers
        automatically reply to comments, direct messages, and story replies based on rules they configure.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account information:</strong> the email address you sign in with and the verification codes we send to it.</li>
        <li>
          <strong>Instagram account data:</strong> when you connect your Instagram Business/Creator account, we store your
          Instagram Business Account ID and the access token issued by Meta so we can act on your behalf (reading comments/DMs
          and sending automated replies).
        </li>
        <li>
          <strong>Automation rules:</strong> the triggers, keywords, and reply text you configure.
        </li>
        <li>
          <strong>Interaction data:</strong> when someone comments on your posts, replies to your stories, or sends you a
          direct message, we process the content needed to match it against your rules (e.g. the comment/message text and the
          sender&apos;s Instagram-scoped ID) so we can send the automated reply.
        </li>
      </ul>

      <h2>2. How we use this information</h2>
      <p>
        We use this information solely to operate the Service: authenticating you, connecting to the Instagram Graph API on
        your behalf, matching incoming comments/DMs/story replies against your rules, and sending the replies you configured.
        We do not sell this information, and we do not use it to train AI models.
      </p>

      <h2>3. Data retention and deletion</h2>
      <p>
        Your automation rules and the record of people who have interacted with your Instagram account through the Service
        are kept for as long as your Instagram account stays connected. If you disconnect your Instagram account, or if Meta
        notifies us of a data deletion request, we delete your automation rules, the interaction records tied to your
        Instagram channel, and your stored Instagram access token. See our <a href="/data-deletion">Data Deletion</a> page for
        details on how to request this yourself.
      </p>

      <h2>4. Sharing</h2>
      <p>
        We share data with Meta/Instagram only as required to operate the Service (the Instagram Graph API itself). We do not
        sell or share your data with any other third party.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions about this policy can be sent to <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>, or by
        mail to {LEGAL.companyName}, {LEGAL.companyAddress}.
      </p>
    </LegalLayout>
  )
}
