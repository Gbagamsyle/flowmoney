import fs from 'node:fs';
const config = JSON.parse(fs.readFileSync(new URL('../docs/privacy-release.json', import.meta.url), 'utf8'));
const required = ['productionRegionsAndTransfersConfirmed','vendorAgreementsReviewed','retentionAndBackupsConfirmed','productionAccessAndEnvironmentSeparationVerified','diagnosticsAndAnalyticsDeliveryVerified','rightsAndIncidentRunbooksRehearsed','dpiaAndRegistrationAssessmentReviewed','legalReviewApproved','publishedNoticesMatchProduction'];
const missing = required.filter(key=>config[key] !== true);
if(config.status !== 'approved') missing.push('status must be approved');
if(!/^\d{4}-\d{2}-\d{2}$/.test(config.effectiveDate ?? '')) missing.push('confirmed effective date');
if(missing.length) { console.error('Privacy launch review is incomplete:\n- '+missing.join('\n- '));process.exitCode=1; }
else console.log('Privacy release register complete. Verify the deployed notices match the approved register.');
