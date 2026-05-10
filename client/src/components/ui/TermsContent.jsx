import { legalStyles as s } from './LegalModal'

// ─── TermsContent ─────────────────────────────────────────────────────────────
// PLACEHOLDER — replace this content with your generated Terms of Service.
// Recommended generator: https://termly.io or https://privacypolicygenerator.info
//
// To update: replace the text inside each <p>, <li>, and <h3> tag.
// Do NOT change the structure or style props — those come from legalStyles.
// ─────────────────────────────────────────────────────────────────────────────
export function TermsContent() {
  return (
    <div>
      <span style={s.lastUpdated}>Last updated: May 2026</span>

      <div style={s.highlight}>
        <p style={s.highlightText}>
          Please read these terms carefully before using MindOrb. By creating an account,
          you agree to be bound by these Terms of Service.
        </p>
      </div>

      <div style={s.section}>
        <h3 style={s.h3}>1. Acceptance of Terms</h3>
        <p style={s.p}>
          By accessing or using MindOrb ("the App"), you agree to be bound by these
          Terms of Service and all applicable laws and regulations. If you do not agree
          with any of these terms, you are prohibited from using the App.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>2. Use of the Service</h3>
        <p style={s.p}>MindOrb is a cognitive wellness platform. You agree to use it only for:</p>
        <ul style={s.ul}>
          <li style={s.li}>Personal, non-commercial wellness and self-reflection purposes</li>
          <li style={s.li}>Lawful activities that comply with all applicable laws</li>
          <li style={s.li}>Honest and accurate input during sessions</li>
        </ul>
        <p style={s.p}>
          You must not use the App to harm others, spread misinformation, or attempt
          to reverse-engineer our AI models or systems.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>3. User Accounts</h3>
        <p style={s.p}>
          You are responsible for maintaining the confidentiality of your account
          credentials and for all activities that occur under your account. You must
          notify us immediately of any unauthorized use of your account.
        </p>
        <p style={s.p}>
          You must be at least 13 years of age to use MindOrb. By using the App,
          you represent that you meet this age requirement.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>4. Your Content</h3>
        <p style={s.p}>
          The words, reflections, and inputs you provide during sessions ("Your Content")
          remain yours. By using MindOrb, you grant us a limited license to process
          your content solely for the purpose of providing the service to you.
        </p>
        <p style={s.p}>
          We do not sell your content to third parties or use it to train AI models
          without your explicit consent.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>5. Intellectual Property</h3>
        <p style={s.p}>
          The MindOrb name, logo, design, and all associated content (excluding Your Content)
          are owned by MindOrb and protected by applicable intellectual property laws.
          You may not copy, modify, or distribute our proprietary assets without written permission.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>6. Disclaimers</h3>
        <p style={s.p}>
          MindOrb is a wellness tool and is NOT a substitute for professional mental health
          care, therapy, or medical advice. If you are experiencing a mental health crisis,
          please contact a qualified professional or emergency services.
        </p>
        <p style={s.p}>
          The App is provided "as is" without warranties of any kind, either express or implied.
          We do not guarantee uninterrupted access or error-free operation.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>7. Limitation of Liability</h3>
        <p style={s.p}>
          To the maximum extent permitted by law, MindOrb shall not be liable for any
          indirect, incidental, or consequential damages arising from your use of the App.
          Our total liability to you shall not exceed the amount you paid us in the
          twelve months preceding the claim.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>8. Changes to Terms</h3>
        <p style={s.p}>
          We may update these Terms at any time. We will notify you of significant changes
          via the App or email. Continued use after changes constitutes acceptance of the
          new Terms.
        </p>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <h3 style={s.h3}>9. Contact</h3>
        <p style={s.p}>
          For questions about these Terms, contact us at:{' '}
          <span style={{ color: 'var(--color-accent-2)' }}>legal@mindorb.app</span>
        </p>
      </div>
    </div>
  )
}