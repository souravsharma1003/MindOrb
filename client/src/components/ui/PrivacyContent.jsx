import { legalStyles as s } from './LegalModal'

// ─── PrivacyContent ───────────────────────────────────────────────────────────
// PLACEHOLDER — replace this content with your generated Privacy Policy.
// Recommended generator: https://termly.io or https://privacypolicygenerator.info
//
// To update: replace the text inside each <p>, <li>, and <h3> tag.
// Do NOT change the structure or style props — those come from legalStyles.
// ─────────────────────────────────────────────────────────────────────────────
export function PrivacyContent() {
  return (
    <div>
      <span style={s.lastUpdated}>Last updated: May 2026</span>

      <div style={s.highlight}>
        <p style={s.highlightText}>
          Your privacy matters to us. MindOrb collects only what's necessary to provide
          the service and never sells your personal data to third parties.
        </p>
      </div>

      <div style={s.section}>
        <h3 style={s.h3}>1. Information We Collect</h3>
        <p style={s.p}>We collect the following types of information:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong style={{ color: 'var(--color-text-1)' }}>Account information</strong> — name, email address, and password (hashed)</li>
          <li style={s.li}><strong style={{ color: 'var(--color-text-1)' }}>Session data</strong> — words and reflections you submit during sessions</li>
          <li style={s.li}><strong style={{ color: 'var(--color-text-1)' }}>Usage data</strong> — session frequency, features used, and general app interactions</li>
          <li style={s.li}><strong style={{ color: 'var(--color-text-1)' }}>Device data</strong> — device type, OS version, and app version for crash reporting</li>
        </ul>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>2. How We Use Your Information</h3>
        <p style={s.p}>Your information is used to:</p>
        <ul style={s.ul}>
          <li style={s.li}>Provide, maintain, and improve the MindOrb service</li>
          <li style={s.li}>Generate your personal insights, streaks, and session history</li>
          <li style={s.li}>Send you notifications you have opted into (e.g. streak reminders)</li>
          <li style={s.li}>Respond to support requests and fix bugs</li>
          <li style={s.li}>Comply with legal obligations</li>
        </ul>
        <p style={s.p}>
          We do NOT use your session content to train AI models or for advertising purposes.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>3. Third-Party Services</h3>
        <p style={s.p}>MindOrb uses the following third-party services:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong style={{ color: 'var(--color-text-1)' }}>Google Sign-In</strong> — for OAuth authentication (governed by Google's Privacy Policy)</li>
          <li style={s.li}><strong style={{ color: 'var(--color-text-1)' }}>Facebook Login</strong> — for OAuth authentication (governed by Meta's Privacy Policy)</li>
          <li style={s.li}><strong style={{ color: 'var(--color-text-1)' }}>Anthropic Claude API</strong> — for generating session stories and insights</li>
        </ul>
        <p style={s.p}>
          Each third-party service has its own privacy policy governing how they handle your data.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>4. Data Storage & Security</h3>
        <p style={s.p}>
          Your data is stored on secure servers. We use industry-standard encryption
          for data in transit (HTTPS/TLS) and at rest. Passwords are hashed and never
          stored in plain text.
        </p>
        <p style={s.p}>
          While we take reasonable steps to protect your data, no method of transmission
          over the internet is 100% secure.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>5. Data Retention</h3>
        <p style={s.p}>
          We retain your account data for as long as your account is active. Session data
          is retained to provide your history and insights. You may request deletion of
          your data at any time by contacting us.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>6. Your Rights</h3>
        <p style={s.p}>Depending on your location, you may have the right to:</p>
        <ul style={s.ul}>
          <li style={s.li}>Access the personal data we hold about you</li>
          <li style={s.li}>Request correction of inaccurate data</li>
          <li style={s.li}>Request deletion of your data ("right to be forgotten")</li>
          <li style={s.li}>Object to or restrict certain processing of your data</li>
          <li style={s.li}>Data portability — receive your data in a machine-readable format</li>
        </ul>
        <p style={s.p}>
          To exercise these rights, contact us at{' '}
          <span style={{ color: 'var(--color-accent-2)' }}>privacy@mindorb.app</span>
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>7. Children's Privacy</h3>
        <p style={s.p}>
          MindOrb is not directed at children under 13. We do not knowingly collect
          personal information from children under 13. If you believe a child has
          provided us with personal data, please contact us immediately.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>8. Changes to This Policy</h3>
        <p style={s.p}>
          We may update this Privacy Policy from time to time. We will notify you of
          significant changes via the App or by email. The "last updated" date at the
          top of this page reflects the most recent revision.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>9. Contact Us</h3>
        <p style={s.p}>
          If you have questions about this Privacy Policy or how we handle your data:{' '}
          <span style={{ color: 'var(--color-accent-2)' }}>privacy@mindorb.app</span>
        </p>
      </div>
    </div>
  )
}