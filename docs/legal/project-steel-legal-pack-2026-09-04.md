# Project Steel — UK legal pack (working draft)

**Date:** 4 September 2026  
**Status:** DRAFT / PRE-LAUNCH / NOT YET FOR PUBLICATION  
**Purpose:** Source-of-truth legal/compliance working pack for Project Steel while the product is in private beta preparation.

> This is a practical compliance draft, not a substitute for advice from a UK solicitor, data-protection specialist or trade mark attorney. Before public launch, replace all placeholders, verify the actual data flows/cookies/processors, and obtain professional review where appropriate.

---

## 1. Locked legal/product decisions

- Primary brand: **PROJECT STEEL**.
- Primary UK domain registrar: **Cloudflare Registrar**.
- Intended primary domain: `projectsteel.co.uk`.
- Intended app host: `app.projectsteel.co.uk`.
- Defensive domain: `projectsteel.uk` if available/appropriate.
- Founding offer: **first 20 legitimate, verified beta members receive core Steel Premium at £0 for the lifetime of their account**, subject to the Founding 20 terms below.
- No card is required for the private beta.
- A Founding 20 place is secured only after successful email verification and atomic server-side allocation.
- Pending/unverified signups do not consume a Founder place.
- The public counter must show only genuinely allocated Founder places; no optimistic or fake increments.
- #21 onward joins the beta/waitlist without a lifetime-Premium promise.
- Separate future products, coaching, marketplace services or major standalone add-ons may be excluded from the Founding 20 entitlement.
- Recommended launch rule for the private beta: **18+ only**, unless/until a separate children/teen compliance review is completed.

---

# 2. Privacy Policy — draft copy

## Project Steel Privacy Policy

**Last updated:** [PUBLICATION DATE]

Project Steel ("Steel", "we", "us", "our") is a fitness and performance software service. This notice explains how we collect, use, share and protect personal information when you visit our website, join the beta, create an account or use the Steel app.

### 2.1 Who is responsible for your information

Data controller: **[LEGAL ENTITY / SOLE TRADER NAME]**, trading as Project Steel.  
Contact: `privacy@projectsteel.co.uk` **[activate before publication]**  
Registered/business address: **[INSERT ONLY WHEN FINAL BUSINESS STRUCTURE IS CONFIRMED]**

If Project Steel is operated through a limited company, replace the above with the company's full registered name, registered office, company number and jurisdiction.

### 2.2 Information we may collect

Depending on the features you use, Steel may process:

- **Account and identity data:** email address, account identifiers, verification status and authentication/security records.
- **Profile data:** display name, preferences, goals and settings you choose to provide.
- **Training data:** workouts, exercises, sets, repetitions, loads, training history, programme choices and related progress data.
- **Nutrition data:** foods, meals, calories, macronutrients and nutrition preferences where those features are used.
- **Body/progress data:** weight, measurements, targets and progress entries that you choose to record.
- **Recovery/wellbeing data:** only where a Steel feature specifically asks for and processes such data.
- **Beta-signup data:** email, verification state, Founder/waitlist status, signup source and relevant anti-abuse/security information.
- **Technical/security data:** device/browser information, IP-derived security signals, timestamps, error logs and authentication events where reasonably necessary for security, fraud/abuse prevention and reliability.
- **Usage/analytics data:** interactions with the website/app where analytics is enabled in accordance with applicable privacy and PECR rules.
- **Support communications:** information you send when requesting help or giving product feedback.

Steel should not collect medical records, diagnosis information or other sensitive health information unless a future feature genuinely requires it and the necessary UK GDPR safeguards have been designed first.

### 2.3 Why we use personal information and our lawful basis

| Purpose | Typical data | UK GDPR basis |
|---|---|---|
| Create and operate a Steel account | account/profile data | Contract / steps at the user's request before entering a contract |
| Provide requested training, nutrition and progress features | user-entered app data | Contract |
| Operate beta signup and Founder allocation | email, verification, Founder/waitlist status | Contract / steps at the user's request; legitimate interests for abuse prevention and integrity |
| Authenticate users and secure the service | account/security/technical data | Legitimate interests; contract where necessary to provide the account |
| Prevent bots, fraud and duplicate/abusive registrations | technical/security data | Legitimate interests |
| Provide support and resolve issues | account/support data | Contract and legitimate interests |
| Improve Steel using product analytics | usage data | Legitimate interests where UK GDPR permits; PECR/SAT rules must also be satisfied |
| Send optional marketing/product-update emails | email and preference | Consent unless another lawful route clearly applies |
| Meet legal/regulatory obligations | relevant records | Legal obligation |

**Special category data:** Some fitness/body/recovery information may, depending on context and how it is used or inferred, qualify as data concerning health. Before Steel intentionally processes special-category health data for an optional feature, the feature must have an identified Article 9 condition and appropriate safeguards. For many optional consumer-health features, **separate explicit consent** may be the appropriate condition; this must not be inferred or bundled into general Terms.

### 2.4 Founding 20 verification and anti-abuse

Steel may use Cloudflare Turnstile or similar security technology, duplicate checks, rate limits and limited anti-abuse signals to protect the Founding 20 allocation from bots and fraudulent registrations.

Unverified signups do **not** count toward the public Founding 20 counter. A Founder number is allocated only after successful verification and server-side allocation.

Where an IP address or similar identifier is needed for short-term security/rate limiting, Steel should minimise retention and avoid retaining raw identifiers longer than needed.

### 2.5 Marketing communications

Joining the beta must **not automatically subscribe a person to marketing**.

Any marketing opt-in should be separate, optional and unticked by default. Users must be able to unsubscribe easily. Service messages such as verification emails, security notices and account communications are not marketing where they are genuinely necessary to provide the requested service.

### 2.6 Cookies and storage/access technologies

The website/app may use technologies such as cookies, local storage, authentication tokens or similar storage/access technologies.

- Technologies strictly necessary for authentication, security, fraud prevention or a user-requested function may be used without consent where the statutory exception applies, but users should still be clearly informed.
- Under the current UK rules following the Data (Use and Access) Act 2025, an analytics/statistical exception may apply where the **sole purpose** is aggregate statistical measurement to improve the website/service, the data is not retained at individual level beyond what is needed to aggregate it, and users are given clear information plus a **simple and free means to object**.
- Advertising, cross-site tracking, behavioural profiling or analytics that goes beyond that exception requires prior valid consent where no other PECR exception applies.

For the private beta, the recommended posture is **no advertising trackers and no behavioural advertising**.

### 2.7 Who we share information with

Steel may use service providers to operate the product, for example:

- hosting/CDN/security providers;
- database/authentication/backend providers;
- transactional email providers;
- error monitoring/analytics providers where enabled;
- professional advisers or authorities where legally required.

Before publication, replace this category-level wording with a reviewed processor list and confirm each provider's purpose, data location, DPA and international-transfer safeguards.

Current known infrastructure includes **Cloudflare** and **Supabase**, but the final privacy notice must reflect the actual live configuration at launch rather than assumptions.

### 2.8 International transfers

If personal information is transferred outside the UK, Steel will use a lawful transfer mechanism where required, such as UK adequacy regulations, the UK International Data Transfer Agreement, the UK Addendum to approved standard contractual clauses, or another legally valid safeguard.

The precise transfer wording must be checked against the actual processor contracts and hosting regions before publication.

### 2.9 How long we keep information

Recommended launch defaults, to be implemented and verified before publication:

- Active account data: while the account remains active and as needed to provide the service.
- Deleted account: remove or irreversibly anonymise live-service data within **30 days**, subject to legitimate security/legal retention and backup cycles.
- Backups containing deleted data: expire within a defined maximum cycle, recommended **90 days** unless a shorter period is technically practical.
- Unverified beta signup: verification expires after **24 hours**; stale pending records should be deleted/anonymised on a documented short retention schedule.
- Waitlist: until the beta/waitlist purpose ends or the person withdraws, with a periodic cleanup/reconfirmation process.
- Security/rate-limit logs: short retention appropriate to abuse prevention, recommended target **30–90 days** unless a longer period is demonstrably necessary.
- Support records: retain only for as long as reasonably needed to resolve issues and defend legitimate claims.

The published privacy notice must describe the **actual implemented schedule**, not merely these recommended defaults.

### 2.10 Your rights

Subject to the law and any applicable exceptions, individuals may have rights to:

- be informed about processing;
- access their personal information;
- correct inaccurate information;
- request deletion;
- restrict processing;
- receive/port certain information;
- object to certain processing;
- withdraw consent where processing relies on consent;
- complain to the Information Commissioner's Office (ICO).

Requests: `privacy@projectsteel.co.uk` **[activate before publication]**.

ICO information: https://ico.org.uk/make-a-complaint/

### 2.11 Security

Steel will use proportionate technical and organisational measures such as access controls, authenticated accounts, row-level database controls where applicable, encryption in transit, secure secrets handling, rate limiting and logging/monitoring appropriate to the service.

No internet service can guarantee absolute security.

### 2.12 Changes to this notice

Material privacy changes should be clearly communicated. The notice should always display its effective date.

---

# 3. Terms of Use — draft copy

## Project Steel Terms of Use

**Last updated:** [PUBLICATION DATE]

These Terms govern use of Project Steel's website, private beta and application. By creating an account or using Steel, you agree to these Terms.

### 3.1 Operator

Project Steel is operated by **[LEGAL ENTITY / SOLE TRADER NAME]**, trading as Project Steel.  
Contact: `hello@projectsteel.co.uk` **[activate before publication]**.

### 3.2 Eligibility

For the private beta, users must be **18 or over** and legally capable of entering into these Terms.

Accounts are personal and may not be sold, transferred or shared in a way that undermines account security or a Founder entitlement.

### 3.3 What Steel provides

Steel provides software tools for recording, organising and reviewing fitness, training, nutrition, recovery and progress information, depending on the features available at the time.

Steel is an evolving product. Beta features may change, be added, be removed or be temporarily unavailable.

### 3.4 Account security

You are responsible for maintaining the confidentiality of your login credentials and for activity reasonably attributable to your account. Tell us promptly if you suspect unauthorised access.

### 3.5 Acceptable use

You must not:

- use Steel unlawfully;
- attempt to bypass security or access another user's data;
- interfere with the service or abuse rate limits;
- automate fraudulent beta/Founder registrations;
- scrape, reverse engineer or exploit the service except where the law expressly permits it;
- upload unlawful, malicious or rights-infringing material.

### 3.6 Your information

You retain rights in information you enter into Steel. You give us the limited rights needed to host, process, back up and display it to provide and improve the service in accordance with the Privacy Policy.

### 3.7 Intellectual property

The Project Steel name, branding, software, visual design, original content and related intellectual property belong to the relevant Steel operator/licensor except where third-party rights are identified.

These Terms grant only a personal, revocable, non-exclusive, non-transferable right to use the service for its intended purpose.

### 3.8 Fitness, nutrition and health information

Steel is a software product and **is not a medical service**. Unless a future feature explicitly states otherwise and is provided by an appropriately qualified professional, content generated or displayed by Steel is for general fitness/information purposes and is not diagnosis, treatment or personalised medical advice.

Users remain responsible for deciding whether an exercise, nutrition choice or training programme is suitable for them. See the Fitness & Health Disclaimer below.

### 3.9 Beta availability

During beta, Steel may contain bugs, incomplete features or changing functionality. We may perform maintenance or make changes needed for security, reliability, product development or legal compliance.

Nothing in these Terms excludes rights that cannot lawfully be excluded.

### 3.10 Founding 20

Founding 20 entitlements are governed by the separate **Founding 20 / Private Beta Terms** below. Those terms take priority if there is a conflict specifically about the Founding entitlement.

### 3.11 Suspension and termination

We may suspend or terminate an account where reasonably necessary for security, abuse, fraud, serious breach of these Terms or legal compliance.

A genuine Founding 20 entitlement should not be removed merely because the user logs out, changes device, resets credentials or moves through a normal account migration.

Where a Founder account is suspended for suspected abuse, the entitlement should be preserved while the matter is reviewed unless fraud or material breach is established.

### 3.12 Liability

Steel does not promise uninterrupted or error-free availability, particularly during beta.

To the maximum extent permitted by law, we are not responsible for losses that were not reasonably foreseeable when the user agreed to these Terms, or for business losses incurred by a consumer using Steel for personal purposes.

**Nothing in these Terms limits or excludes liability where the law does not allow us to do so**, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or mandatory consumer rights.

### 3.13 Changes to the Terms

We may update these Terms for legal, security, technical or product reasons. Material changes should be notified reasonably in advance where practicable.

A change to general Terms must not be used to retrospectively remove a valid Founding 20 core-Premium entitlement contrary to the Founding 20 terms, except where necessary to comply with law or where the relevant service itself is permanently discontinued.

### 3.14 Governing law

These Terms are governed by the laws of **England and Wales**, without removing any mandatory consumer protections or rights a user has under the law that applies to them.

---

# 4. Founding 20 / Private Beta Terms — draft copy

## Project Steel Founding 20 Private Beta Terms

**Offer summary:** The first **20 legitimate beta members** who successfully verify their email and are allocated a Founder number by Steel's server-side allocation system receive **core Steel Premium at £0 for the lifetime of their account**.

### 4.1 No purchase required

The Founding 20 private-beta offer costs **£0** and requires **no payment card**.

### 4.2 Verification is required

Submitting an email does not reserve or secure a Founder place.

After signup, the user must complete email verification. Verification links expire after the configured verification window, currently intended to be **24 hours**.

A Founder place is secured only when:

1. the email has been successfully verified;
2. the signup passes reasonable anti-abuse checks; and
3. the server atomically allocates an available Founder number from 1–20.

### 4.3 First 20 means first 20 successfully allocated

The public counter reflects **verified allocated Founder places only**.

If two people verify when only one place remains, the allocation must be handled server-side so that only one can receive Founder #20. The other verified user becomes waitlisted/beta status without the lifetime-Premium entitlement.

### 4.4 What the lifetime entitlement includes

A valid Founding 20 member receives the **core Steel Premium plan at £0** for the lifetime of that account, including across normal device changes, logout/login cycles, credential resets and supported account migrations.

The entitlement:

- has no recurring subscription charge;
- has no expiry date while the relevant account and core Steel Premium service continue;
- is personal to the Founder account;
- is non-transferable and has no cash value.

### 4.5 What it does not automatically include

The Founding 20 entitlement applies to **core Steel Premium**. It does not automatically include separate future products or materially separate services such as:

- one-to-one coaching;
- marketplace purchases;
- physical products;
- third-party services;
- separate specialist products;
- major standalone add-ons launched outside core Steel Premium.

We must not re-label ordinary core Premium functionality as a separate add-on merely to avoid the Founding promise.

### 4.6 Product changes and discontinuation

Steel may evolve, rename features or restructure the product. Where core Steel Premium is migrated to an equivalent successor offering, a valid Founding entitlement should, where reasonably practicable, follow the equivalent core offering.

The lifetime entitlement does not require Project Steel to operate forever. If the Steel service is permanently discontinued, the entitlement ends with the discontinued service. This clarification must not be used to create an artificial discontinuation simply to defeat Founder rights.

### 4.7 Fraud, abuse and duplicate registrations

We may reject, revoke or remediate an allocation obtained through bots, false identities, exploitative automation, duplicate manipulation or other material abuse of the offer.

Normal privacy email aliases should not automatically be treated as fraud. Abuse decisions should be evidence-based and capable of manual review.

If a Founder allocation is revoked before public launch due to confirmed abuse, Steel may safely promote the next eligible verified waitlisted user if the allocation system and records support this without double-allocation.

### 4.8 Account closure

If a Founder voluntarily deletes the account, the entitlement normally ends with that account. Before deletion, the UI should make the loss of a non-transferable Founding entitlement conspicuous.

Where Steel performs a supported account migration rather than a deletion, the entitlement should be preserved.

### 4.9 Marketing wording

Approved short-form claim:

> **First 20 verified beta members keep core Steel Premium free for life. No card required.**

Required supporting clarification near signup:

> **A Founding 20 place is only secured after email verification and successful allocation. Separate future products or standalone add-ons may be excluded.**

Do not advertise a number of places remaining unless the displayed number comes from the genuine verified-allocation count.

---

# 5. Cookie / Storage & Access Technologies Policy — draft

## Project Steel Cookie & Storage Policy

Steel may use browser/device storage technologies to keep the service secure, remember requested settings and understand how the service performs.

### Categories

**Strictly necessary**  
Used for login/authentication, session continuity, security, fraud prevention, load balancing and other functions required to provide a feature the user requests. Where the statutory exception applies, prior consent is not required, but clear information must still be provided.

**Preferences / appearance**  
Used only to remember choices about how the service appears or functions. The current UK PECR regime contains an appearance/functionality exception in defined circumstances; implementation must meet the statutory requirements and provide the required information/control.

**Statistical analytics**  
Steel may use analytics without prior PECR consent only where the current statistical-purpose exception genuinely applies: sole purpose is aggregate statistics about service use to improve Steel, no individual-level data is kept longer than needed for aggregation, no advertising/profiling use is mixed in, clear information is given, and a simple/free objection mechanism is available.

**Non-essential tracking / advertising**  
Do not enable by default for private beta. If later introduced, obtain valid prior consent unless a specific statutory exception clearly applies.

### Launch requirement: exact technology inventory

Before public publication, run a real website/app storage audit and populate an exact table:

| Technology/cookie | Provider | Purpose | Category | Duration | Consent/exception | Data shared |
|---|---|---|---|---|---|---|
| [TO AUDIT] | [TO AUDIT] | [TO AUDIT] | [TO AUDIT] | [TO AUDIT] | [TO AUDIT] | [TO AUDIT] |

Do **not** publish invented cookie names or durations.

---

# 6. Fitness & Health Disclaimer — draft copy

## Project Steel Fitness & Health Disclaimer

Project Steel provides software and general fitness, training, nutrition and progress information. It is **not a medical service** and is not intended to diagnose, treat, cure or prevent disease or injury.

Unless a feature specifically identifies input from an appropriately qualified professional, Steel content, automated suggestions, calculations, targets and summaries should not be treated as personalised medical, dietetic or clinical advice.

Exercise and changes to diet can involve risk. Users should use their own judgement and seek advice from an appropriately qualified healthcare or fitness professional where they have concerns about whether an activity or dietary change is suitable for them.

Users should not use Steel as a substitute for urgent or emergency medical care.

Food databases, calorie/macronutrient estimates, wearable/device data and user-entered information may contain inaccuracies. Users with allergies, intolerances or medically prescribed dietary requirements should verify relevant information from appropriate primary sources rather than relying solely on Steel.

Nothing in this disclaimer limits liability or consumer rights where the law does not permit limitation.

---

# 7. Website / launch legal disclosure checklist

## Business identity

Before public launch, lock the operating structure:

- [ ] Confirm whether Project Steel operates as an individual/sole trader or through a limited company.
- [ ] Confirm who owns the `PROJECT STEEL` trade mark application.
- [ ] Confirm who is the UK GDPR data controller.
- [ ] Activate `hello@projectsteel.co.uk`, `support@projectsteel.co.uk` and `privacy@projectsteel.co.uk` or equivalent.

### If operated by a UK limited company

The website/business documents must display the company's:

- [ ] full registered company name, including Ltd/Limited;
- [ ] company registration number;
- [ ] registered office address;
- [ ] part of the UK in which the company is registered (for example England and Wales).

Do not invent or publish these until the company/operator is actually confirmed.

## Website footer / legal navigation

- [ ] Privacy Policy
- [ ] Terms of Use
- [ ] Founding 20 / Beta Terms
- [ ] Cookie / Storage Policy
- [ ] Fitness & Health Disclaimer
- [ ] Contact
- [ ] Business identity disclosures once confirmed

## Privacy/data protection

- [ ] Complete ICO data-protection-fee self-assessment; organisations/sole traders processing personal information may need to pay unless exempt.
- [ ] Complete a data-flow/processors inventory.
- [ ] Confirm Cloudflare/Supabase contractual privacy terms, DPAs, regions and international transfer mechanism.
- [ ] Confirm retention/deletion jobs match the published Privacy Policy.
- [ ] Confirm users can request account/data deletion.
- [ ] Confirm marketing consent is separate from beta signup.
- [ ] Decide whether any feature processes special-category health data; if yes, document Article 9 condition and safeguards before launch.
- [ ] Consider a DPIA where health profiling or higher-risk processing is introduced.

## Cookies / device storage

- [ ] Audit actual website and app storage technologies.
- [ ] Classify each as strictly necessary / appearance / statistical / non-essential.
- [ ] If relying on the 2026 statistical analytics exception, ensure analytics is genuinely aggregate-only for service improvement and provide a simple/free opt-out.
- [ ] Block non-exempt storage/tracking until valid consent where required.

## Consumer/marketing compliance

- [ ] Founder counter comes from real verified allocations.
- [ ] No fake scarcity, fake testimonials or fake reviews.
- [ ] Founding 20 exclusions are visible before signup, not hidden after the decision.
- [ ] Marketing claims about results/performance are evidence-based and not guaranteed.
- [ ] Do not imply medical/clinical validation that Steel does not have.
- [ ] Keep `£0 / no card` beta wording accurate.

## Security

- [ ] RLS/access controls reviewed for all user-data tables.
- [ ] Service-role secrets never exposed client-side.
- [ ] Turnstile production keys configured.
- [ ] Rate limiting and duplicate protection tested.
- [ ] Account deletion/export path tested.
- [ ] Incident-response contact/process documented.

---

# 8. Key legal/compliance sources checked

Official sources reviewed for this working pack:

- ICO — Privacy information requirements: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/
- ICO — Final 2026 guidance on storage/access technologies: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/
- ICO — Statistical-purpose/analytics exception: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/
- ICO — Data-protection-fee self assessment: https://ico.org.uk/fee-checker
- GOV.UK / Companies House — Website/company trading disclosures: https://www.gov.uk/running-a-limited-company/signs-stationery-and-promotional-material
- CMA / GOV.UK — Unfair commercial practices under the Digital Markets, Competition and Consumers Act 2024: https://www.gov.uk/government/publications/unfair-commercial-practices-cma207
- GOV.UK / UKIPO — Trade mark filing and classification guidance: https://www.gov.uk/how-to-register-a-trade-mark and https://www.gov.uk/guidance/how-to-classify-trade-marks

---

# 9. Items that still require a factual decision before publication

1. Final legal operator: individual/sole trader vs limited company.
2. Final postal/business address to disclose where legally required.
3. Final support/privacy email addresses after the domain is purchased/configured.
4. Exact processor list, hosting regions, DPAs and international transfer safeguards.
5. Exact cookie/local-storage inventory and durations.
6. Exact account/data retention periods after implementation review.
7. Whether Steel intentionally processes any special-category health data.
8. Final UK trade mark owner and filing wording.
9. Professional legal review before paid/public consumer launch.

Until those are resolved, this document remains a **working legal source-of-truth**, not final website copy.
