/**
 * Privacy policy.
 *
 * Written to the disclosure list the Personal Information Protection Act
 * (개인정보 보호법) puts on a controller — purposes, categories, retention,
 * third-party provision, delegated processing, overseas transfer, destruction,
 * data-subject rights, automated decisions, safeguards, the protection officer,
 * and where to complain — because that statute is what governs a service
 * operated from Korea, whoever the customer is.
 *
 * The split that shapes the whole document: for account data we are the
 * controller, and for what a Session reads out of a customer's SAP system we
 * are a processor acting on that customer's instruction. Those two halves have
 * different legal bases, different retention and different rights attached, so
 * they are kept apart rather than blended into one list.
 *
 * Original text for this product, laid out against the statute's headings —
 * not another service's policy with the names swapped. Constants below are the
 * parts counsel and the operator have to settle; the DRAFT notice stays until
 * that review has happened.
 */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy · SC4SAP" };

/** TODO: replace with the shipping entity and its registered officer. */
const PROVIDER = "SC4SAP";
const CONTACT = "sc4sap.dev@gmail.com";
const OFFICER = "SC4SAP Privacy Officer";

const EFFECTIVE = "To be set at launch";
const VERSION = "Draft 1";

const DRAFT_NOTICE =
  "Draft. This policy has not been reviewed by counsel and no service is " +
  "being offered under it yet. It describes the handling the finished product " +
  "is designed for, not a live processing operation.";

type Section = { id: string; title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: "scope",
    title: "Scope, and the two roles we play",
    body: (
      <>
        <p>
          This policy explains how {PROVIDER} (&ldquo;we&rdquo;) handles
          personal information in the SC4SAP console, its backend and its
          skills (the <strong>Service</strong>). It is written to the
          requirements of the Personal Information Protection Act of the
          Republic of Korea (the <strong>Act</strong>) and its enforcement
          decree, and it forms part of the Terms of Use.
        </p>
        <h3>Where we are the controller</h3>
        <p>
          For the information you give us to have an account — name, email
          address, password, billing details, and the record of what your
          account did — we decide the purposes and means, and we are the
          controller. Sections 3 to 6 describe that half.
        </p>
        <h3>Where we are a processor</h3>
        <p>
          For what a Session reads out of your SAP system — ABAP source,
          dictionary metadata, configuration values, table contents you approved
          an extraction of, and anything you typed into a prompt — we act only
          on your instruction. Your organisation is the controller of that
          material, including any personal information inside it. We process it
          to run the Session you asked for and for nothing else. Section 8
          describes that half.
        </p>
        <p>
          If you are an employee whose organisation administers your account,
          your employer&rsquo;s own privacy notice governs the employment
          relationship; this policy covers only what we do.
        </p>
      </>
    ),
  },
  {
    id: "principles",
    title: "How we approach this",
    body: (
      <ul>
        <li>
          We collect the minimum the Service needs, and we do not make optional
          data a condition of using it.
        </li>
        <li>
          We do not use your content, your prompts or your SAP material to train
          models — ours or anyone else&rsquo;s.
        </li>
        <li>We do not sell personal information, and we never have.</li>
        <li>
          We do not use personal information for a purpose beyond the one it was
          collected for without a fresh legal basis.
        </li>
        <li>
          Secrets — passwords, API keys, SAP credentials — are stored encrypted
          and are never rendered back to the browser once saved.
        </li>
      </ul>
    ),
  },
  {
    id: "collected",
    title: "What we collect",
    body: (
      <>
        <h3>You give us</h3>
        <ul>
          <li>
            <strong>Account</strong> — surname, given name, email address, and a
            password stored only as a salted hash.
          </li>
          <li>
            <strong>Connection profiles</strong> — SAP host, instance or client
            number, tier label, the SAP user name, and that user&rsquo;s
            credentials. Credentials are encrypted at rest.
          </li>
          <li>
            <strong>Model API key</strong> — the key the Service uses to reach
            the Model Provider on your behalf, encrypted at rest.
          </li>
          <li>
            <strong>Billing</strong> — company name, address and tax
            identifiers where a paid plan applies. Card details go to the
            payment processor and are never held by us.
          </li>
          <li>
            <strong>Support and feedback</strong> — whatever you write to us,
            including anything you paste into a message.
          </li>
        </ul>
        <h3>The Service generates</h3>
        <ul>
          <li>
            <strong>Session records</strong> — prompts, transcripts, the tools a
            Session called, and the approvals you granted or refused, with
            timestamps. Approvals are attributed to the account that granted
            them; that attribution is the audit record, and it is deliberate.
          </li>
          <li>
            <strong>Usage and cost</strong> — turn counts, token counts and the
            cost each Session reported.
          </li>
          <li>
            <strong>Operational logs</strong> — IP address, user agent, request
            paths, timestamps, and error traces, kept for security and
            debugging.
          </li>
        </ul>
        <h3>What we ask you not to send</h3>
        <p>
          Do not put personal information into a prompt where the question does
          not need it, and do not point a Skill at production data you are not
          permitted to send outside your network. The guardrails in the Service
          block bulk extraction from tables on a standing blocklist, but they
          cannot classify your own custom tables and they are not a substitute
          for your review.
        </p>
      </>
    ),
  },
  {
    id: "purposes",
    title: "Why we process it, and on what basis",
    body: (
      <>
        <p>
          Under the Act we process personal information on one of these bases:
          performance of the contract with you, your consent, our legitimate
          interest where it does not override your rights, or a legal
          obligation. Specifically:
        </p>
        <ul>
          <li>
            <strong>Running the Service</strong> — authenticating you, reaching
            your SAP systems, running Sessions, storing transcripts so you can
            reopen them. Basis: performance of the contract.
          </li>
          <li>
            <strong>Billing and tax</strong> — invoicing, collection, and the
            records commercial and tax law requires us to keep. Basis: contract
            and legal obligation.
          </li>
          <li>
            <strong>Security and abuse prevention</strong> — detecting
            unauthorised access, investigating incidents, enforcing the Terms of
            Use, and keeping the audit record of approvals. Basis: legitimate
            interest and legal obligation.
          </li>
          <li>
            <strong>Support</strong> — answering what you write to us. Basis:
            contract.
          </li>
          <li>
            <strong>Improving the Service</strong> — aggregate and de-identified
            statistics about how features are used. Basis: legitimate interest.
            This never includes reading your SAP content or your transcripts.
          </li>
          <li>
            <strong>Marketing</strong> — product announcements and newsletters,
            only where you opted in, and every message carries an unsubscribe
            link. Basis: consent.
          </li>
        </ul>
        <p>
          Consent, where it is the basis, is optional: refusing it costs you the
          feature it was asked for and nothing else. You can withdraw it at any
          time, and withdrawal does not affect processing already carried out.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <>
        <p>
          We keep personal information only for as long as the purpose requires,
          then destroy it. In practice:
        </p>
        <ul>
          <li>
            <strong>Account records</strong> — for the life of the account, then
            destroyed without delay on closure, save for what is listed below.
          </li>
          <li>
            <strong>Connection profiles and API keys</strong> — until you delete
            the profile or close the account, whichever comes first.
          </li>
          <li>
            <strong>Sessions and transcripts</strong> — until you delete them or
            close the account. You can delete any single Session at any time.
          </li>
          <li>
            <strong>Approval audit records</strong> — retained with the Session
            they belong to, and destroyed with it.
          </li>
          <li>
            <strong>Operational logs</strong> — up to three months, longer only
            where an open security investigation needs them.
          </li>
          <li>
            <strong>Support correspondence</strong> — up to three years from the
            last message.
          </li>
        </ul>
        <p>
          Where a statute sets a period, that period wins. Under the Act on
          Consumer Protection in Electronic Commerce and the tax statutes we
          retain contract and payment records for five years, records of
          consumer complaints or dispute handling for three years, advertising
          records for six months, and, under the Protection of Communications
          Secrets Act, access logs for three months.
        </p>
        <p>
          Backups age out on their own cycle, so a deletion propagates to them
          within that cycle rather than instantly.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Provision to third parties",
    body: (
      <>
        <p>
          <strong>
            We do not provide your personal information to third parties for
            their own purposes.
          </strong>{" "}
          We will do so only where you have separately consented, or where a
          statute requires it — a warrant, a court order, or a lawful demand
          from an investigating authority following the procedure the law sets
          out.
        </p>
        <p>
          Where we receive such a demand we check that it is valid and narrow
          in scope, disclose only what it covers, and tell you unless the law
          forbids us from doing so.
        </p>
        <p>
          If we are ever part of a merger, acquisition or transfer of business,
          we will notify you of the transferee and of your right to withdraw
          before the transfer takes effect, as the Act requires.
        </p>
      </>
    ),
  },
  {
    id: "processors",
    title: "Delegated processing and our subprocessors",
    body: (
      <>
        <p>
          We delegate parts of the processing to providers who work under
          written contract, on our instruction only, with confidentiality,
          security and audit obligations imposed as the Act requires. The
          current list:
        </p>
        <ul>
          <li>
            <strong>Anthropic</strong> — runs the model that answers a Session.
            Receives the prompt and whatever the Session read from your SAP
            system.
          </li>
          <li>
            <strong>Cloud hosting and database provider</strong> — runs the
            Service and stores its data.
          </li>
          <li>
            <strong>Error monitoring and log aggregation</strong> — receives
            operational logs and crash traces.
          </li>
          <li>
            <strong>Email delivery</strong> — sends account, billing and
            security messages.
          </li>
          <li>
            <strong>Payment processor</strong> — handles card details, which
            never reach us.
          </li>
        </ul>
        <p>
          We publish changes to this list before a new provider starts, and we
          supervise the ones on it. Where a provider processes personal
          information outside Korea, section 9 applies.
        </p>
      </>
    ),
  },
  {
    id: "customer-content",
    title: "Personal information inside your SAP content",
    body: (
      <>
        <p>
          When a Session reads from your SAP system, whatever it read is sent to
          the Model Provider so the model can answer. If personal information is
          present in that material — in a table you approved an extraction of,
          in test data, or hard-coded in a program — it is transmitted with the
          rest.
        </p>
        <p>
          For that material your organisation is the controller and we are its
          processor. We use it to run the Session, we do not use it for any
          purpose of our own, we do not use it to train models, and we delete it
          with the Session it belongs to. Deciding whether a Session may
          lawfully touch that data in the first place is the controller&rsquo;s
          call.
        </p>
        <p>
          Where your organisation needs one, we will enter a data processing
          agreement setting out instructions, subprocessors, security measures,
          assistance with data-subject requests, breach notification and
          deletion on termination. Ask at {CONTACT}.
        </p>
      </>
    ),
  },
  {
    id: "overseas",
    title: "Transfer of personal information overseas",
    body: (
      <>
        <p>
          Running the Service involves transfer outside Korea, and the Act
          requires us to tell you exactly what that transfer is. For the model
          call:
        </p>
        <ul>
          <li>
            <strong>What is transferred</strong> — the prompt, the material the
            Session read from your SAP system, and the Session&rsquo;s
            conversation history. Personal information is included only where it
            is present in that material.
          </li>
          <li>
            <strong>Where, and to whom</strong> — Anthropic, in the United
            States, over an encrypted connection.
          </li>
          <li>
            <strong>When</strong> — at the moment a Session runs; there is no
            batch export.
          </li>
          <li>
            <strong>Purpose</strong> — generating the answer to that Session,
            and nothing else.
          </li>
          <li>
            <strong>Retention by the recipient</strong> — for the period set out
            in the Model Provider&rsquo;s own terms and policies, which you
            accept by using your own API key.
          </li>
        </ul>
        <p>
          Hosting, logging and email providers may likewise process data outside
          Korea. In every case we contract for protection equivalent to what the
          Act requires and transfer over encrypted channels.
        </p>
        <p>
          You may refuse an overseas transfer. Because the model call is what
          the Service does, refusing it means the Service cannot run for you —
          so the practical form of that refusal is to not use the Service, and
          we will say so plainly rather than pretend there is a partial mode.
        </p>
      </>
    ),
  },
  {
    id: "destruction",
    title: "How we destroy it",
    body: (
      <>
        <p>
          When a retention period ends or the purpose is met, we destroy the
          information without delay — in practice within thirty days of the
          triggering event.
        </p>
        <ul>
          <li>
            Electronic records are deleted by a method that leaves them
            irrecoverable, and encrypted records are destroyed by discarding the
            key as well as the ciphertext.
          </li>
          <li>Anything on paper is shredded or incinerated.</li>
          <li>
            Records held under a statutory period are separated from live data
            and stored apart until that period ends.
          </li>
          <li>
            An account dormant for a year is notified before we separate or
            delete its data.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights, and how to use them",
    body: (
      <>
        <p>As a data subject under the Act you may at any time:</p>
        <ul>
          <li>ask what we hold about you, and get a copy of it;</li>
          <li>have it corrected if it is wrong, or completed if it is partial;</li>
          <li>have it deleted, unless a statute requires us to keep it;</li>
          <li>tell us to stop processing it;</li>
          <li>withdraw a consent you gave, without penalty;</li>
          <li>
            receive a machine-readable export of what you supplied and what your
            Sessions produced.
          </li>
        </ul>
        <h3>How</h3>
        <p>
          Most of this is in the console: settings holds your account details
          and connection profiles, and any Session can be exported or deleted
          from where it is listed. For anything else, write to {CONTACT}. We
          answer within ten days of receiving a request, as the Act requires,
          and we tell you the reason in writing if we cannot act on it — along
          with how to object.
        </p>
        <p>
          We verify identity before acting, to stop someone else exercising your
          rights for you. A legal representative or an agent may act for you on
          production of the authority the Act&rsquo;s enforcement rules
          prescribe. A child under fourteen must have a legal
          representative&rsquo;s consent, and we do not knowingly open accounts
          for children.
        </p>
        <p>
          Requests about material inside your SAP content go to the controller
          of that system — your organisation. If one reaches us directly, we
          pass it on rather than acting alone.
        </p>
      </>
    ),
  },
  {
    id: "automated",
    title: "Automated decisions",
    body: (
      <>
        <p>
          The Service does not make automated decisions that produce legal
          effects for you or significantly affect you. The model generates
          answers and drafts; it does not decide anything about a person.
        </p>
        <p>
          Where that ever changes we will say so here first, explain the logic
          and the criteria in plain terms, and give you the Act&rsquo;s rights
          to refuse the decision and to ask for an explanation and a review by a
          human.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <>
        <p>
          We take the administrative, technical and physical measures the Act
          requires, including:
        </p>
        <ul>
          <li>
            an internal management plan, access rules, and periodic staff
            training;
          </li>
          <li>
            access limited to the minimum number of people, granted by role,
            reviewed regularly, and revoked immediately when someone leaves;
          </li>
          <li>
            encryption in transit for everything, and encryption at rest for
            passwords, API keys and SAP credentials — passwords as a one-way
            salted hash that we cannot reverse;
          </li>
          <li>
            access logs retained and reviewed so unauthorised use can be traced;
          </li>
          <li>
            intrusion prevention, vulnerability management and patching on the
            systems that run the Service;
          </li>
          <li>
            physical controls at the data centres our hosting provider operates.
          </li>
        </ul>
        <p>
          No safeguard is absolute. If a breach affects your personal
          information we will notify you and the Protection Commission without
          delay, in the form and within the time the Act sets, and tell you what
          happened, what was affected and what to do about it.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    body: (
      <>
        <p>
          We use cookies and browser storage only for what the Service needs to
          work: keeping you signed in, remembering which session or skill you
          had open, and holding your language and rail preference. There is no
          advertising cookie and no third-party tracker on the console.
        </p>
        <p>
          You can refuse or delete cookies in your browser settings. Refusing
          the session cookie means you cannot stay signed in.
        </p>
      </>
    ),
  },
  {
    id: "officer",
    title: "Privacy officer and where to write",
    body: (
      <>
        <p>
          We have designated a privacy officer responsible for handling personal
          information, for your requests, and for complaints and remedies
          arising from our processing.
        </p>
        <ul>
          <li>
            <strong>Privacy officer</strong> — {OFFICER}
          </li>
          <li>
            <strong>Email</strong> — {CONTACT}
          </li>
          <li>
            <strong>Security reports</strong> — {CONTACT}
          </li>
        </ul>
        <p>
          Write to us first about anything in this policy. We answer without
          delay, and within the periods the Act sets.
        </p>
      </>
    ),
  },
  {
    id: "remedies",
    title: "If you are not satisfied",
    body: (
      <>
        <p>
          You can take a complaint to any of these bodies, independently of us:
        </p>
        <ul>
          <li>
            <strong>Personal Information Dispute Mediation Committee</strong> —
            1833-6972, kopico.go.kr
          </li>
          <li>
            <strong>Personal Information Infringement Report Centre</strong>{" "}
            (Korea Internet &amp; Security Agency) — 118, privacy.kisa.or.kr
          </li>
          <li>
            <strong>Supreme Prosecutors&rsquo; Office</strong> — 1301,
            spo.go.kr
          </li>
          <li>
            <strong>National Police Agency cybercrime bureau</strong> — 182,
            ecrm.police.go.kr
          </li>
        </ul>
        <p>
          Under the Act you may also seek an administrative appeal against a
          disposition or omission by a public authority in respect of your
          rights.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <>
        <p>
          We update this policy when the Service or the law changes. We post the
          new version here with its effective date and keep the previous
          versions available.
        </p>
        <p>
          For a change that matters to you — a new purpose, a new subprocessor,
          a new recipient overseas, or a longer retention period — we give
          notice in the console or by email at least seven days before it takes
          effect, and thirty days where the Act requires it. Where a change
          needs your consent, we ask for it rather than assuming it.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="page">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="page-lede">
            What SC4SAP collects, why, where it goes, and what you can make us
            do about it.
          </p>
        </div>
      </header>

      <div
        className="legal rise"
        style={{ "--delay": "110ms" } as React.CSSProperties}
      >
        <ul className="legal-meta">
          <li>
            <b>Effective</b> {EFFECTIVE}
          </li>
          <li>
            <b>Version</b> {VERSION}
          </li>
          <li>
            <b>Controller</b> {PROVIDER}
          </li>
        </ul>

        <p className="notice-block">{DRAFT_NOTICE}</p>

        <p className="legal-intro">
          Two things carry most of what matters here: section 1, which separates
          the data we control from the SAP content we merely process for you,
          and section 9, which sets out what leaves Korea when a Session runs.
        </p>

        {SECTIONS.map((section, index) => (
          <section className="legal-section" id={section.id} key={section.id}>
            <h2>
              <span className="legal-num" aria-hidden="true">
                {index + 1}.
              </span>
              <span>{section.title}</span>
            </h2>
            {section.body}
          </section>
        ))}
      </div>
    </div>
  );
}
