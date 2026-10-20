export type LegalSection = { title: string; paragraphs: string[] };
export type LegalContent = {
  title: string;
  introduction: string;
  sections: LegalSection[];
};
export const LEGAL_VERSION = "0.1";
export const PRIVACY_EMAIL = "ogabasyle@gmail.com";
// Change only after the operational privacy review in docs/privacy-readiness.md.
export const LEGAL_STATUS = "Pre-launch draft";
export const legalDocuments: Record<string, LegalContent> = {
  privacy: {
    title: "Privacy Policy",
    introduction:
      "GeeTech operates FlowMoney, a non-custodial cash-flow planning service. This notice explains what we process, why, and the choices available to you.",
    sections: [
      {
        title: "Who we are",
        paragraphs: [
          "The operator and privacy contact is GeeTech. Email ogabasyle@gmail.com about this notice, privacy requests or security concerns. This version is a pre-launch draft dated 20 October 2026; a final effective date will be announced before launch.",
          "FlowMoney does not hold money, operate your bank account or request banking passwords, PINs or one-time passwords.",
        ],
      },
      {
        title: "Information you provide",
        paragraphs: [
          "We process your email and authentication identifier, currency preferences, onboarding status and account timestamps. Clerk manages sign-in and may process profile information you give it.",
          "Financial records include account names and balances, expected income, dates and confidence, obligations and priorities, monthly plans, allocations, savings targets, approved planning actions and remembered transaction categories. Scenario changes are evaluated without changing those records and are not saved as scenario records.",
          "Statement files may contain dates, descriptions, amounts, balances, account identifiers, counterparties and references. We extract structured transaction dates, descriptions, amounts, direction, currency, categories, provenance and confidence. Descriptions may themselves contain names or account references. We derive cash-flow summaries and transaction patterns.",
        ],
      },
      {
        title: "Purposes and legal bases",
        paragraphs: [
          "We process the account and financial information necessary to provide the planning and statement-analysis services you request, on the basis of performing our service agreement with you. Upload only records you are entitled to use; remove unnecessary third-party information where practical.",
          "Optional product analytics relies on your opt-in choice. You can withdraw it in Settings; this stops future product events in this browser. Necessary security and reliability processing is based on our legitimate interests in protecting the service, balanced against your rights. We may process information to meet a legal obligation where one applies. We do not treat acknowledgement of this notice as blanket consent to every purpose.",
        ],
      },
      {
        title: "What happens to statements",
        paragraphs: [
          "Raw PDF, CSV and XLSX uploads are processed temporarily in server memory and in an isolated parser process. We do not write the source document to application file storage or object storage. The upload buffer is cleared after success or failure and the parser process is terminated. Transient runtime copies are reclaimed by the runtime; instantaneous erasure of every memory copy cannot be guaranteed.",
          "Analysis saves structured parsed rows to your account before approval so you can review them later. Review drafts, imported rows and excluded reference rows remain until you delete the statement or your FlowMoney account. Approval controls which rows count as imported; it does not erase excluded rows. Saved category rules remain until removed or your account is deleted.",
          "Uploading does not connect your bank or automatically change Current Funds, Expected Income or Obligations. Separate confirmed planning actions can create records. Parsing and categorisation currently use deterministic software rules on the backend; statement data is not sent to an external AI classification provider. Scans/OCR are unsupported.",
        ],
      },
      {
        title: "Service providers and disclosures",
        paragraphs: [
          "Clerk provides authentication. Neon/PostgreSQL stores FlowMoney account and structured financial records. ExchangeRate-API supplies public reference rates; requests to it contain no identity, balance or statement data.",
          "Vercel for the website and Render for the API are the selected hosting plan, not yet a completed production deployment. The final provider locations, subprocessors and transfer arrangements must be confirmed before this draft becomes the launch notice.",
          "Sentry error monitoring is used only when configured and receives a reduced diagnostic event, with request bodies, identities, breadcrumbs and financial text removed by our filter. Performance tracing is disabled. PostHog is used only when configured and product analytics is opted into. Automatic page capture and session recording are disabled; an outbound allowlist keeps only named usage events and SDK identifiers/token, removing page URLs, referrers and custom properties. It does not build person profiles. Providers still receive the connection information needed to deliver their services, such as IP addresses.",
          "We do not sell personal or financial information to advertisers. We may disclose information when legally required or reasonably necessary to investigate abuse or protect people and the service. Contacting our support email also sends your message to the email provider; do not email raw statements or credentials.",
        ],
      },
      {
        title: "International processing",
        paragraphs: [
          "Providers may process information outside Nigeria. Final production regions, processing agreements and applicable transfer safeguards are still a launch requirement. We will document them in the final notice rather than claim an unverified location or safeguard.",
        ],
      },
      {
        title: "Retention and deletion",
        paragraphs: [
          "Active account and financial records remain until you delete them or your account. Raw uploads follow the memory-only lifecycle above, including failed processing. There is currently no automatic expiry of saved statement-review drafts.",
          "Deleting your FlowMoney account removes its financial records and anonymises its local identity fields. A minimal anonymised deletion row remains for system integrity. Your Clerk identity is separate and is not deleted by this action; contact us for assistance with a separate identity request. A later sign-in starts a fresh FlowMoney profile.",
          "Product analytics and error-monitoring retention, infrastructure log retention and backup expiry must be fixed in the production vendor configuration before launch. Revoking analytics does not automatically erase already collected provider events; contact us to request their deletion where applicable. Live-system deletion may not immediately remove backup copies. Recovery procedures must preserve deletions before restored data is exposed.",
        ],
      },
      {
        title: "Browser storage and choices",
        paragraphs: [
          "Essential authentication cookies support sign-in. Browser storage remembers appearance, analytics preference, onboarding progress and per-user product-tour state. Optional analytics uses its own identifier only after opt-in. You can change analytics and appearance in Settings, and clear browser storage through your browser. Clearing it may reset choices or sign you out. FlowMoney also registers a service worker for app installation and a public offline screen. Its cache stores only that public screen and brand icons, not financial pages or API responses. Browser storage can be cleared through browser settings.",
        ],
      },
      {
        title: "Security and automated analysis",
        paragraphs: [
          "Authenticated access, server-side ownership checks, upload limits and isolated parsing help protect your records. We minimise diagnostic content and keep application secrets outside source code. No online system guarantees absolute security. Production transport, access permissions, incident procedures and vendor safeguards are release checks.",
          "Categories, Safe-to-Spend, projections and reference-rate conversions can be wrong. You can review and correct categories. FlowMoney does not make lending, eligibility or other legally significant decisions on your behalf, and does not move money.",
        ],
      },
      {
        title: "Your rights and requests",
        paragraphs: [
          "Subject to applicable law, you may request access, correction, deletion, portability, restriction or objection to processing, withdraw consent, and seek human review of relevant automated decisions. Email ogabasyle@gmail.com. We may verify identity using information proportionate to the request; do not send passwords or banking credentials. We will explain any lawful limits on a request.",
          "You can also complain to the Nigeria Data Protection Commission at ndpc.gov.ng. These rights do not depend on accepting marketing or optional analytics.",
        ],
      },
      {
        title: "Adults and updates",
        paragraphs: [
          "FlowMoney is intended for people aged 18 or older. Do not create an account or upload data if you are under 18. We do not currently operate a child-focused service.",
          "We will identify the effective version and provide reasonable notice of material privacy changes through the app or another appropriate channel. Questions: ogabasyle@gmail.com.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    introduction:
      "These terms describe the agreement between you and GeeTech for use of FlowMoney. Please read them with the Privacy Policy and Financial Disclaimer.",
    sections: [
      {
        title: "Agreement and eligibility",
        paragraphs: [
          "By creating an account or using FlowMoney, you agree to the applicable Terms of Service. The Privacy Policy explains processing; reading it is not blanket consent for optional analytics. If you do not agree to the terms, do not use the service. You must be at least 18 and entitled to provide the information you enter.",
          "This version 0.1 is a pre-launch draft dated 20 October 2026. GeeTech will publish the final effective version before deployment.",
        ],
      },
      {
        title: "A planning service, not a bank",
        paragraphs: [
          "FlowMoney organises current funds, expected income, obligations, plans, scenarios and statement insights. It is not a bank, deposit-taking institution, payment processor, lender, investment broker, insurer or custodial wallet. Your funds remain wherever you hold them. We do not request banking PINs, passwords or OTPs.",
        ],
      },
      {
        title: "Your account and records",
        paragraphs: [
          "Maintain access to your authentication method, enter reasonably accurate information, review imported records and report suspected unauthorised use. Do not access anyone else’s account. You retain rights in information you lawfully provide and permit GeeTech to process it only as necessary to operate the service and for the purposes explained in the Privacy Policy.",
        ],
      },
      {
        title: "Estimates and limitations",
        paragraphs: [
          "Safe-to-Spend, projections, risk indicators, transaction categories and currency conversions are informational estimates. Expected income is not money already received or guaranteed. Calculations depend on the records available to FlowMoney and may omit commitments or contain errors. Planning allocations and Overview calculations may use different scopes, as labelled.",
          "Exchange rates are current reference estimates, not historical accounting values or executable bank quotes. Review original currencies and amounts before relying on converted totals. FlowMoney does not provide personalised financial, investment, legal, accounting or tax advice or guarantee an outcome.",
        ],
      },
      {
        title: "Statement Insights",
        paragraphs: [
          "Upload only files you have authority to process. Do not upload unlawfully obtained records, another person’s private statement without authority, credentials or malicious files. You may need to remove unnecessary third-party information.",
          "Analysis saves structured rows for review. Only approved rows count as imported. Excluded reference rows remain until the statement is deleted. Uploading alone does not change account balances, income or obligations; separately confirmed planning actions can create records. You are responsible for reviewing categories, amounts and duplicates.",
        ],
      },
      {
        title: "Acceptable use",
        paragraphs: [
          "Do not commit fraud, impersonate others, upload malware, scrape protected records, bypass access controls, unlawfully use data or attack the service. Report security concerns privately to ogabasyle@gmail.com. GeeTech may restrict access reasonably necessary to address abuse, unlawful activity or security threats.",
        ],
      },
      {
        title: "Private alpha and availability",
        paragraphs: [
          "Private alpha can contain bugs, interruptions and changing or discontinued features. We do not promise uninterrupted availability. Any disposable test environment must be identified as such before a reset; keep independent copies of records you need.",
        ],
      },
      {
        title: "Deletion and termination",
        paragraphs: [
          "You can delete FlowMoney records through available controls or request assistance. Account deletion removes financial records and anonymises local identity fields, but does not close external bank accounts, move funds or automatically delete your separate Clerk identity. See the retention notice for backups and diagnostic data.",
          "We may suspend or terminate access where reasonably necessary for serious violations, security or legal requirements. You may contact us to ask for an explanation or review, subject to lawful restrictions.",
        ],
      },
      {
        title: "Ownership and responsibility",
        paragraphs: [
          "GeeTech and its licensors retain rights in FlowMoney software, branding and original product materials. You retain your lawful rights in your data.",
          "To the extent permitted by applicable law, FlowMoney is not responsible for losses caused solely by reliance on estimates or incomplete user-supplied data. Nothing excludes liability or statutory consumer or data-protection rights that cannot lawfully be excluded.",
        ],
      },
      {
        title: "Changes, law and contact",
        paragraphs: [
          "We may update the service and terms. Material changes affecting legal or privacy rights will receive reasonable notice where required. The final effective version will be identified so you can review it.",
          "These terms are governed by the laws of the Federal Republic of Nigeria unless mandatory applicable law requires otherwise. Contact GeeTech at ogabasyle@gmail.com.",
        ],
      },
    ],
  },
  "financial-disclaimer": {
    title: "Financial Disclaimer",
    introduction:
      "FlowMoney provides financial organisation, cash-flow analysis and planning tools. It does not provide personalised financial, investment, legal, accounting or tax advice.",
    sections: [
      {
        title: "Estimates, not guarantees",
        paragraphs: [
          "Safe-to-Spend, projections, warnings, statement categories and scenario results are estimates from information available to the app. They may be incomplete or wrong. Expected income is not guaranteed or money already received. Check missing obligations, dates and categories before spending.",
          "Daily reference-rate estimates can differ from bank rates, fees and historical rates. Changing display currency does not exchange money or change the original amount.",
        ],
      },
      {
        title: "Your decisions and your money",
        paragraphs: [
          "Review your financial position independently and consult a qualified professional where appropriate for significant decisions. FlowMoney does not guarantee any financial outcome, hold your funds, connect your bank through an upload or make decisions on your behalf.",
          "Questions for GeeTech: ogabasyle@gmail.com. This disclaimer does not exclude rights or responsibility that applicable law does not permit us to exclude.",
        ],
      },
    ],
  },
  "statement-processing": {
    title: "How statement processing works",
    introduction:
      "Your statement contains financial information. Upload only records you are authorised to use. Never provide a bank PIN, password or OTP.",
    sections: [
      {
        title: "1. Choose and analyse",
        paragraphs: [
          "Choose a digital PDF, CSV or single-sheet XLSX and confirm its original currency. Limits are 5 MB, 5,000 transactions and 250 PDF pages, with additional text and processing limits. Scans/OCR and password-protected documents are unsupported. A bank connection is not created.",
        ],
      },
      {
        title: "2. Temporary source, saved review",
        paragraphs: [
          "The original file is processed in server memory and an isolated parser process; no raw document is saved to application file or object storage. The upload buffer is cleared after success or failure and the parser ends. Runtime copies are reclaimed by the runtime.",
          "Structured transactions are saved as a review draft before approval, including descriptions that may contain personal references. Deterministic rules assign categories and confidence; no external AI classifier receives the statement. Drafts do not automatically expire.",
        ],
      },
      {
        title: "3. Review before import",
        paragraphs: [
          "Review uncertain categories and select transactions to import. Transfers are considered separately from spending. Only approved rows count as imported. Excluded rows remain as reference data until you delete the statement. Original amounts and currencies are preserved; converted summaries are separate estimates.",
          "Uploading and approving statement history do not automatically update Current Funds, Expected Income or Obligations. Additional planning actions require their own confirmation.",
        ],
      },
      {
        title: "4. Delete when no longer needed",
        paragraphs: [
          "Delete a statement to remove its saved structured rows, or delete your FlowMoney account to remove its financial records. Previously confirmed records created through separate planning actions may need separate deletion. Saved category rules are managed separately and are removed on account deletion. For access or deletion requests, contact ogabasyle@gmail.com.",
        ],
      },
    ],
  },
  "data-retention": {
    title: "Data Retention & Deletion",
    introduction:
      "Keep only what is needed for the service. This notice describes current application behaviour and the production settings that still require confirmation.",
    sections: [
      {
        title: "Account and financial records",
        paragraphs: [
          "Profile preferences and financial records remain while the account is active unless individually deleted. Statement-review drafts, imported and excluded rows have no automatic expiry; delete the statement when no longer needed. Remembered category rules remain until removed or account deletion.",
        ],
      },
      {
        title: "Raw uploads",
        paragraphs: [
          "Raw statement documents are not persisted by the application. Processing uses transient memory, clears the upload buffer on success or failure and ends the parser process. JavaScript/runtime memory copies cannot be guaranteed to be instantly erased.",
        ],
      },
      {
        title: "Account deletion",
        paragraphs: [
          "The deletion control removes accounts, income, obligations, plans, actions, statements, rows, category rules and onboarding state. Local identity fields are anonymised and a minimal deletion row remains. External bank accounts and funds are unaffected. Clerk sign-in identity is separate; contact us for assistance with an identity request.",
        ],
      },
      {
        title: "Analytics, diagnostics and backups",
        paragraphs: [
          "Optional analytics can be disabled in Settings. Withdrawal stops future product events but is not retrospective provider deletion. Contact GeeTech for applicable access or deletion requests. Production retention periods for PostHog, Sentry, infrastructure logs and backups are not yet confirmed and must be documented before launch.",
          "Deletion from live systems may not immediately remove backup copies. A production recovery process must reconcile deletions before serving restored records; backup expiry and vendor retention will be stated in the final policy.",
        ],
      },
      {
        title: "Requests",
        paragraphs: [
          "Email ogabasyle@gmail.com for access, correction, portability or deletion assistance. We may need proportionate identity verification. Do not send banking credentials or raw statements by email.",
        ],
      },
    ],
  },
};
