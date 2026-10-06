import { LegalLayout } from './LegalLayout'
import { LEGAL } from './legalContent'

export function IntlTermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms govern your use of Nivo Smart DM (the &quot;Service&quot;), provided by {LEGAL.companyName}
        (&quot;we&quot;, &quot;us&quot;). By connecting your Instagram account and using the Service, you agree to these
        Terms.
      </p>

      <h2>1. What the Service does</h2>
      <p>
        The Service lets you configure automation rules that reply to Instagram comments, story replies, and direct messages
        with text you write in advance. Replies are rule-based: the Service does not generate AI-written responses on your
        behalf.
      </p>

      <h2>2. Your Instagram account</h2>
      <p>
        You must be the owner or an authorized administrator of the Instagram Business/Creator account you connect. You are
        responsible for the content of the replies your rules send, and for complying with Instagram&apos;s own Terms of Use
        and Community Guidelines.
      </p>

      <h2>3. Acceptable use</h2>
      <p>
        You agree not to use the Service to send spam, misleading replies, or content that violates Instagram&apos;s
        policies or applicable law. We may suspend access to the Service if we reasonably believe it is being used this way.
      </p>

      <h2>4. Availability</h2>
      <p>
        The Service is provided free of charge during this phase. We do not guarantee uninterrupted availability and may
        change or discontinue features with notice where reasonably possible.
      </p>

      <h2>5. Disconnecting</h2>
      <p>
        You may disconnect your Instagram account at any time from within the Service, which stops all automated replies.
        See our <a href="/data-deletion">Data Deletion</a> page for what happens to your data afterward.
      </p>

      <h2>6. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after a change means you accept the
        updated Terms.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about these Terms can be sent to <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalLayout>
  )
}
