/**
 * Terms of use.
 *
 * Written against the *finished* product — the whole skill catalogue, per-user
 * accounts, per-user SAP connection profiles, per-user API keys and the write
 * tier — not against what the PoC can do today. That is deliberate: terms that
 * described only the current build would need rewriting at every phase, and
 * the obligations that matter (who may connect a system, who owns the change
 * that lands in it, what leaves the network) are the same on day one as they
 * are at GA.
 *
 * This is original text written for this product. The constants below are the
 * only things that vary by who ships it, and they are the parts counsel has to
 * settle — the DRAFT notice stays on the page until that review has happened.
 * Delete `DRAFT_NOTICE` and its render to publish.
 */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use · SC4SAP" };

/** TODO: replace with the shipping entity, its jurisdiction and its contacts. */
const PROVIDER = "SC4SAP";
const JURISDICTION = "the Republic of Korea";
const VENUE = "the Seoul Central District Court";
const CONTACT = "sc4sap.dev@gmail.com";
const SECURITY_CONTACT = "sc4sap.dev@gmail.com";

const EFFECTIVE = "To be set at launch";
const VERSION = "Draft 1";

const DRAFT_NOTICE =
  "Draft. These terms have not been reviewed by counsel and no service is " +
  "being offered under them yet. Nothing on this page binds you or us until " +
  "the effective date above is a real one.";

type Section = { id: string; title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: "agreement",
    title: "The agreement",
    body: (
      <>
        <p>
          These terms form a contract between you and {PROVIDER} covering your
          use of the SC4SAP console, its backend, its skills, its documentation
          and everything else we make available at the same place (together, the{" "}
          <strong>Service</strong>). Creating an account, connecting an SAP
          system, or running a single Session means you accept them.
        </p>
        <p>
          If you are accepting on behalf of an employer or a client, you confirm
          that you are authorised to bind that organisation. From that point,{" "}
          <em>you</em> in these terms means that organisation, and the person
          who clicked accept is one of its users.
        </p>
        <h3>Documents that form part of this agreement</h3>
        <p>
          The privacy notice, the plan and pricing page you subscribed under,
          and any written order form or data processing agreement we sign with
          you are part of this agreement. Where they conflict, the more specific
          document wins: a signed order form first, then a data processing
          agreement, then these terms, then everything else.
        </p>
        <h3>What is not part of it</h3>
        <p>
          Your agreements with SAP, with the Model Provider, and with any other
          third party stand on their own. We are not a party to them, they do
          not change these terms, and nothing here relieves you of an obligation
          you owe under them.
        </p>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Definitions",
    body: (
      <>
        <ul>
          <li>
            <strong>Connected System</strong> — an SAP system you register with
            the Service through a connection profile, including its ABAP
            repository, its data dictionary, its runtime and its transport
            organiser.
          </li>
          <li>
            <strong>Connection Profile</strong> — the stored host, client,
            credentials and tier that let the Service reach a Connected System.
          </li>
          <li>
            <strong>Tier</strong> — the label a profile carries (development,
            quality assurance, production, or an equivalent of your own) that
            decides which classes of tool a Session may use against it.
          </li>
          <li>
            <strong>Skill</strong> — a named workflow the Service runs against a
            Connected System: analysing a program, tracing a symptom,
            inventorying a package, producing a specification, creating a
            repository object, releasing a transport, and the rest of the
            catalogue.
          </li>
          <li>
            <strong>Session</strong> — one conversation with the assistant,
            including its prompts, its tool calls, the approvals you granted or
            refused, and the transcript that results.
          </li>
          <li>
            <strong>Your Content</strong> — everything you supply, and
            everything the Service reads on your instruction: prompts, uploaded
            files, ABAP source, dictionary metadata, configuration values,
            transport contents, and the artefacts a Session generates.
          </li>
          <li>
            <strong>Output</strong> — the part of Your Content the model
            produced: answers, specifications, analyses, generated code.
          </li>
          <li>
            <strong>Model Provider</strong> — Anthropic, whose API the Service
            calls to run a Session.
          </li>
          <li>
            <strong>Guardrail</strong> — any of the controls in section 8 that
            withhold, block or gate a tool call.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: (
      <>
        <p>
          You may use the Service if you have the legal capacity to enter this
          agreement and are not barred from doing so under any applicable law,
          sanctions regime or export control. The Service is built for
          professional use against systems you work on; it is not offered to
          children and it is not a consumer product.
        </p>
        <p>
          We may refuse to open an account, or close one, where we reasonably
          believe this section is not satisfied.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts",
    body: (
      <>
        <h3>One account, one person</h3>
        <p>
          An account belongs to a single named person. Do not share credentials,
          and do not let anyone else act under your account. Every action the
          Service records against it — every prompt, every Skill run, and above
          all every approval granted at a permission prompt — is treated as
          yours and is attributed to you in the audit record.
        </p>
        <h3>Accurate details</h3>
        <p>
          Keep the name, email address and billing details on the account
          current. Notices we send to the address on file count as delivered
          even if you have stopped reading it.
        </p>
        <h3>Credentials and keys</h3>
        <p>
          Keep your password, your API key and your SAP credentials
          confidential. Choose a password that meets the rule the sign-up form
          enforces, and do not reuse it elsewhere. If you believe any of them
          has been exposed, tell us at {SECURITY_CONTACT} without delay and
          rotate it at its source — an API key in the Model Provider&rsquo;s
          console, an SAP password in the system itself.
        </p>
        <p>
          You remain responsible for activity under your account until you have
          told us, and we are not liable for loss arising before that notice
          reaches us.
        </p>
        <h3>Organisation accounts</h3>
        <p>
          Where an organisation administers accounts for its people, that
          organisation controls them: it may add and remove users, see the
          Sessions its users ran, and export or delete them. If your account is
          administered that way, your employer&rsquo;s internal policies apply
          to it alongside these terms.
        </p>
      </>
    ),
  },
  {
    id: "authorisation",
    title: "Connected Systems and your authority to connect them",
    body: (
      <>
        <h3>You must be authorised</h3>
        <p>
          You may register a Connected System only if its owner has authorised
          you to access it in the way the Service will: reading repository
          objects, reading dictionary contents and, on a tier that permits it,
          creating and changing objects and recording them onto transports.
          Registering a system you have no authority over is a breach of these
          terms and, in most places, of the law.
        </p>
        <h3>The SAP user is yours</h3>
        <p>
          The Service acts as the SAP user your profile authenticates as, and
          can do exactly what SAP has already granted that user — no more.
          Provisioning that user, scoping its authorisations, and reviewing them
          over time is your responsibility. Use a dedicated technical user
          limited to what your work actually needs rather than a personal
          administrator account.
        </p>
        <h3>Tiers are your declaration</h3>
        <p>
          You tell us which tier a profile is. The Service withholds tools on
          that basis, so a production system registered as development will be
          treated as development, with the write tier available against it. Label
          your systems accurately; we cannot detect a mislabelled one, and the
          consequences of a wrong label are yours.
        </p>
        <h3>Reachability and network access</h3>
        <p>
          Getting the Service to a system that is not on the public internet —
          tunnels, allowlists, VPNs, gateway configuration — is your side of the
          line. Do not open a network path that your own security policy
          forbids in order to make a Skill run.
        </p>
        <h3>Licensing</h3>
        <p>
          You confirm that connecting the system breaches neither your
          agreements with SAP nor anyone else&rsquo;s rights, and that you hold
          whatever licences your use of that system requires, including for
          programmatic access. We do not provide SAP licences, we do not advise
          on them, and we are not a party to yours.
        </p>
      </>
    ),
  },
  {
    id: "api-key",
    title: "Your API key and third-party services",
    body: (
      <>
        <h3>Model usage is billed to you</h3>
        <p>
          The Service runs Sessions against the Model Provider using{" "}
          <strong>your own API key</strong>. That usage is billed to you by the
          Model Provider under your agreement with them, not by us. Their terms,
          their acceptable use policy and their availability commitments apply
          to that traffic in addition to these terms, and a change on their side
          can change what the Service can do.
        </p>
        <h3>Set a spend cap</h3>
        <p>
          Token cost tracks how much source and metadata a Session has to read.
          A broad question against a large package can cost many times what a
          narrow one costs, and a Skill that inventories a whole package is
          expensive by design. Set a cap on the key, and treat the cap rather
          than our interface as the thing that stops runaway spend.
        </p>
        <h3>Cost figures in the console</h3>
        <p>
          Costs shown per Session are our own accounting of what that Session
          reported. They are there to help you compare one run with another.
          They are not an invoice, they may lag, and where they differ from the
          Model Provider&rsquo;s billing, the Model Provider&rsquo;s billing is
          what you owe.
        </p>
        <h3>Model choice</h3>
        <p>
          We choose which model a Skill runs on and may change that choice — for
          quality, cost, availability, or because a model is retired. Output can
          change as a result. Where a change materially alters what you can
          expect from a Skill, we will say so in the release notes.
        </p>
      </>
    ),
  },
  {
    id: "data",
    title: "What leaves your network",
    body: (
      <>
        <h3>Assume what a Skill reads is transmitted</h3>
        <p>
          To answer a question, the Service reads from the Connected System and
          sends what it read to the Model Provider. In practice that means ABAP
          source, dictionary definitions, table and field metadata,
          configuration values, transport contents, and every word you type. If
          a Skill has to look at something to do its job, that thing leaves your
          network.
        </p>
        <p>
          <strong>
            Do not point the Service at data you are not permitted to send
            outside your network.
          </strong>{" "}
          The Guardrails in section 8 reduce the risk of bulk personal or
          financial data leaving a system, but they are a safety net, not a
          compliance programme. They cannot classify your data for you, they do
          not know which of your custom tables hold personal data, and they are
          no substitute for your own review.
        </p>
        <h3>What we store</h3>
        <p>
          We store your account details, your Connection Profiles, and your
          Sessions with their transcripts, so that you can reopen work and so
          that an audit record of approvals exists. Secrets in a profile are
          encrypted at rest and are never rendered back to the browser after
          they are saved.
        </p>
        <h3>Retention and deletion</h3>
        <p>
          You can delete a Session or a profile at any time, and deleting an
          account removes both on the schedule set out in the privacy notice,
          except for records we are required to keep. Backups age out on their
          own cycle, so deletion is not instantaneous everywhere.
        </p>
        <h3>Personal data</h3>
        <p>
          Where we handle personal data on your behalf we do so as your
          processor, on your instructions, as described in the privacy notice
          and any data processing agreement between us. Deciding whether a
          Session may lawfully touch personal data at all is your call as the
          controller, not ours.
        </p>
      </>
    ),
  },
  {
    id: "guardrails",
    title: "Guardrails and approvals",
    body: (
      <>
        <p>
          The Service constrains what a Session can do in three layers, which
          fail in different directions on purpose.
        </p>
        <h3>Layer one — tools withheld by tier</h3>
        <p>
          Tools that mutate a Connected System are removed entirely from
          Sessions running against a tier that is not authorised to write. The
          model cannot call what it cannot see, so this layer cannot be talked
          around by a cleverly worded prompt.
        </p>
        <h3>Layer two — the blocklist</h3>
        <p>
          Extraction of table rows is blocked outright for tables on a standing
          blocklist, which covers banking, payroll and comparable data. This
          layer runs before a request ever reaches you: when it fires there is
          nothing to approve, and no approval granted anywhere else can override
          it.
        </p>
        <h3>Layer three — human approval</h3>
        <p>
          Sensitive calls that survive the first two layers stop and ask you.
          Nothing runs until you answer. A request left unanswered is denied
          automatically after a timeout, and closing the browser denies rather
          than approves.
        </p>
        <h3>An approval is an instruction</h3>
        <p>
          When you allow a call you are directing the Service to make it against
          your system, with your credentials, and you accept the result. Read
          the call before you allow it — the request shows you the tool and its
          exact input for that reason. An approval cannot be undone once the
          call has run.
        </p>
        <h3>Do not defeat them</h3>
        <p>You will not attempt to work around any Guardrail, including by:</p>
        <ul>
          <li>
            rewording a prompt, or splitting a request into fragments, to get
            around the blocklist;
          </li>
          <li>
            widening the SAP user&rsquo;s authorisations to reach data the tier
            withholds;
          </li>
          <li>
            mislabelling a profile&rsquo;s tier to unlock the write tools;
          </li>
          <li>
            reaching the Connected System through a path that bypasses the
            Service&rsquo;s tooling.
          </li>
        </ul>
        <h3>What the Guardrails do not promise</h3>
        <p>
          They constrain tools; they do not audit your data. They cannot
          guarantee that no sensitive value ever appears in a program you asked
          the Service to read, because a value sitting in source code is part of
          the source code. Treat them as one control among yours, not as the
          whole of your controls.
        </p>
      </>
    ),
  },
  {
    id: "writes",
    title: "Changes, transports and non-production first",
    body: (
      <>
        <h3>These are real changes</h3>
        <p>
          Skills on the write tier create and modify repository objects,
          activate them, and can record them onto transports. Nothing about that
          is a simulation. Once a change is written it exists in your system,
          with your technical user as its author, and undoing it is an ordinary
          SAP task rather than something the Service can reverse for you.
        </p>
        <h3>Your change management governs</h3>
        <p>
          Review, approval, testing and release remain yours. The Service has no
          view of your process, does not know your release calendar, and does
          not decide what is fit to move. Nothing it produces is a substitute
          for the sign-off your organisation requires.
        </p>
        <h3>Non-production first</h3>
        <p>
          Run generated work against a development or sandbox system, review the
          diff, and test it before it moves onward. Take a backup or a snapshot
          where the change is not trivially reversible. You decide what is
          released and when, and we are not responsible for what a change does
          downstream once you release it.
        </p>
      </>
    ),
  },
  {
    id: "output",
    title: "Output is a draft, not advice",
    body: (
      <>
        <h3>It can be wrong</h3>
        <p>
          The Service is built on a language model, and its Output can be wrong,
          incomplete, or confidently mistaken — including about your own code.
          It can cite a table that does not exist on your system, describe
          behaviour a program does not have, or generate ABAP that compiles and
          still does the wrong thing. Specifications, analyses, symptom traces
          and generated code are drafts for a competent reviewer, not
          deliverables.
        </p>
        <h3>It is not professional advice</h3>
        <p>
          Nothing the Service produces is legal, tax, audit, security,
          accounting or other professional advice, and no advisory relationship
          arises from your use of it. Keep a qualified human accountable for
          anything that reaches a system that matters.
        </p>
        <h3>It is not unique to you</h3>
        <p>
          Similar prompts produce similar Output for different customers. We
          make no claim that Output is original or unique to you, and you should
          not assume it is when you decide how to use it.
        </p>
        <h3>Third-party rights in Output</h3>
        <p>
          Output can resemble material owned by someone else, and it can
          reproduce patterns from the source it was shown. Before you ship
          generated code, satisfy yourself that using it does not infringe
          anyone&rsquo;s rights and does not breach a licence you are bound by —
          including SAP&rsquo;s, where the Output touches standard objects.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You will not use the Service to:</p>
        <ul>
          <li>
            access any system you are not authorised to access, or exceed the
            access its owner granted you;
          </li>
          <li>
            extract personal, payroll, banking, health or similarly regulated
            data in bulk, or assemble such a set out of repeated narrow queries;
          </li>
          <li>
            circumvent, disable, degrade or probe a Guardrail, the approval
            flow, or any rate or quota limit;
          </li>
          <li>
            break any law, or infringe anyone&rsquo;s intellectual property,
            privacy or confidentiality rights;
          </li>
          <li>
            develop, test or deploy malicious code, or use the Service to
            attack, scan or disrupt any system;
          </li>
          <li>
            resell, sublicense, or expose the Service to third parties as though
            it were your own service, or use it to build or train a competing
            product;
          </li>
          <li>
            scrape, mirror or systematically extract the Service&rsquo;s
            interface, prompts or skill definitions;
          </li>
          <li>
            interfere with the Service&rsquo;s operation or with other
            customers&rsquo; use of it, including by automating traffic at a
            volume the Service is not offered at;
          </li>
          <li>
            misrepresent Output as reviewed, verified or human-authored where
            that matters to whoever receives it.
          </li>
        </ul>
        <p>
          We may investigate suspected breaches and may take the steps in
          section 17. Where we can, we will tell you first.
        </p>
      </>
    ),
  },
  {
    id: "your-responsibilities",
    title: "Your operational responsibilities",
    body: (
      <>
        <p>Alongside the specific obligations above, you agree to:</p>
        <ul>
          <li>
            supervise Sessions that run against systems that matter, rather than
            approving requests without reading them;
          </li>
          <li>
            grant the SAP user the least access the work needs, and review that
            access periodically;
          </li>
          <li>
            keep your own backups — the Service is not a backup of your SAP
            system and stores no copy of it;
          </li>
          <li>
            make sure the people you let use your account know these terms and
            follow them, and remain responsible for what they do;
          </li>
          <li>
            tell us at {SECURITY_CONTACT} if you find a vulnerability in the
            Service, give us reasonable time to fix it, and not exploit it
            beyond what proving it requires.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "ip",
    title: "Ownership",
    body: (
      <>
        <h3>Your Content stays yours</h3>
        <p>
          You keep all rights in Your Content. You grant us a worldwide,
          non-exclusive, royalty-free licence to host, store, process and
          transmit it strictly as needed to operate the Service for you —
          including sending it to the Model Provider to run a Session, and
          keeping the transcript so you can reopen it — and for no other
          purpose. That licence ends when the content is deleted, except for
          copies in backups until they age out.
        </p>
        <p>
          <strong>
            We do not use Your Content to train models, and we do not sell it or
            share it with anyone beyond the providers needed to run the Service.
          </strong>
        </p>
        <h3>Output</h3>
        <p>
          As between you and us, and to the extent it is capable of ownership,
          Output generated for you in a Session is yours, and we claim no rights
          in it. Whether Output is protectable at all is a question of the law
          where you are, not something either of us can settle by contract.
        </p>
        <h3>The Service stays ours</h3>
        <p>
          The Service itself — its software, its skills and prompts, its
          interface, its documentation and our marks — remains ours and our
          licensors&rsquo;. These terms grant you a non-exclusive,
          non-transferable, revocable right to use it while your account is in
          good standing, and nothing more. You will not copy, decompile, reverse
          engineer or create derivative works of it except where the law says
          you may despite this clause.
        </p>
        <h3>Feedback</h3>
        <p>
          If you send us feedback, ideas or bug reports, we may use them without
          restriction and without owing you anything. Keep confidential material
          out of feedback.
        </p>
      </>
    ),
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: (
      <>
        <p>
          Each of us may learn the other&rsquo;s confidential information
          through this agreement. Each will protect it with at least reasonable
          care, use it only to perform this agreement, and disclose it only to
          people and providers who need it and are bound to equivalent
          obligations.
        </p>
        <p>
          This does not cover information that is public through no fault of the
          receiver, was already known to it without an obligation of confidence,
          is received from a third party free to disclose it, or is
          independently developed without reference to the other&rsquo;s
          material.
        </p>
        <p>
          Either of us may disclose where the law or a court compels it, giving
          the other notice first where that is lawful and practical, and
          disclosing only what is required.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    title: "Fees, taxes and renewal",
    body: (
      <>
        <p>
          Fees for the Service, if any, are those shown on the plan you
          subscribed under. They are stated exclusive of tax, are billed in
          advance for the period you chose, and are non-refundable except where
          the law requires otherwise or where we have said so in writing.
        </p>
        <p>
          You are responsible for taxes other than those on our income. Where we
          must collect a tax, we will add it to the invoice.
        </p>
        <p>
          Subscriptions renew for the same period unless you cancel before the
          renewal date. We will give at least thirty days&rsquo; notice before a
          price change takes effect at renewal, and you may cancel rather than
          accept it.
        </p>
        <p>
          Model usage on your own API key is separate throughout, as set out in
          section 6, and is never included in a fee you pay us.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability, support and change",
    body: (
      <>
        <p>
          The Service is offered as it is available. We may change, add or
          remove features, and we may take it down for maintenance. Where a
          change materially reduces functionality you rely on, we will give
          reasonable notice unless a security or legal reason makes that
          impossible.
        </p>
        <p>
          Unless a plan or an order form says otherwise, we make no uptime
          commitment and offer support on a reasonable-efforts basis through the
          channels listed in the console.
        </p>
        <p>
          Beta and preview features are labelled as such. They may change or be
          withdrawn at any time, may be less reliable than the rest of the
          Service, and carry no availability or support commitment of any kind.
          Do not depend on one for production work.
        </p>
        <p>
          Parts of the Service depend on third parties — the Model Provider
          above all. An outage, a change or a restriction on their side can stop
          the Service from working, and that is outside our control.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <>
        <h3>By you</h3>
        <p>
          You may stop using the Service and close your account at any time.
          Closing it does not refund fees already paid for the current period
          unless the law requires it.
        </p>
        <h3>By us</h3>
        <p>
          We may suspend or terminate an account that breaches these terms, that
          creates a security, legal or operational risk, or that we are required
          to stop. We will act immediately where the risk is immediate;
          otherwise we will give notice and a reasonable chance to put it right.
          We may also discontinue the Service as a whole on reasonable notice,
          refunding the unused part of any fee you have prepaid.
        </p>
        <h3>What happens next</h3>
        <p>
          On termination your right to use the Service ends and live Sessions
          stop. Export what you need before closing the account. Afterwards we
          delete or anonymise Your Content on the schedule in the privacy
          notice, except what we must keep by law.
        </p>
        <p>
          Termination does not touch a Connected System. Objects created,
          changes written and transports recorded through the Service stay
          exactly where they are, and remain yours to manage.
        </p>
        <h3>Survival</h3>
        <p>
          Clauses that by their nature should outlive this agreement do:
          ownership, confidentiality, fees already due, disclaimers, limitation
          of liability, indemnity, governing law, and this sentence.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimers",
    body: (
      <>
        <p>
          To the fullest extent the law allows, the Service is provided{" "}
          <strong>as is</strong> and <strong>as available</strong>, without
          warranty of any kind — express, implied or statutory — including
          merchantability, fitness for a particular purpose, non-infringement,
          and any warranty arising from a course of dealing or trade usage.
        </p>
        <p>
          In particular, we do not warrant that the Service will be
          uninterrupted, timely or error-free, that a Guardrail will catch every
          case it was built for, that a Session will reach any given result, or
          that Output will be accurate, complete, current, non-infringing or
          suitable for your purposes.
        </p>
        <p>
          Nothing in this section excludes a warranty or a right that cannot
          lawfully be excluded, and where the law gives you a right we cannot
          contract out of, that right stands.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          Neither of us is liable for indirect, incidental, special, punitive or
          consequential loss, or for lost profits, lost revenue, lost goodwill,
          business interruption, or lost or corrupted data, however caused and
          on any theory of liability, even if the possibility was known.
        </p>
        <p>
          Our total aggregate liability arising out of or relating to this
          agreement is capped at the greater of the fees you paid us for the
          Service in the twelve months before the event giving rise to the
          claim, or one hundred United States dollars.
        </p>
        <p>
          Charges the Model Provider billed to your own API key are not fees
          paid to us, and do not count toward that cap. Neither does the cost of
          repairing, reverting or reworking a change made to a Connected System
          through your account.
        </p>
        <p>
          These limits do not apply to fraud, to wilful misconduct, to death or
          personal injury caused by negligence, or to any liability that cannot
          be limited under the law of {JURISDICTION}. They apply to the fullest
          extent permitted everywhere else, and they survive any remedy failing
          of its essential purpose.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <>
        <p>
          You will defend and indemnify us against third-party claims, and
          against the damages, losses and reasonable legal costs finally awarded
          or agreed in settlement, arising from:
        </p>
        <ul>
          <li>your use of the Service in breach of these terms;</li>
          <li>Your Content, or the use we make of it on your instruction;</li>
          <li>
            a change made to a Connected System through your account, including
            a claim that you were not authorised to connect that system;
          </li>
          <li>
            your use of Output, including a claim that it infringes
            someone&rsquo;s rights.
          </li>
        </ul>
        <p>
          We will notify you of the claim promptly, let you control the defence
          with counsel of your choice, and give you reasonable cooperation at
          your expense. You will not settle a claim in a way that admits fault
          on our part, or imposes an obligation on us, without our consent.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <h3>Assignment</h3>
        <p>
          You may not assign this agreement without our written consent. We may
          assign it to an affiliate or in connection with a merger, acquisition
          or sale of substantially all our assets, on notice to you.
        </p>
        <h3>Entire agreement, severability, waiver</h3>
        <p>
          This agreement, with the documents named in section 1, is the whole
          agreement between us about the Service and replaces anything said
          before it. If a clause is held unenforceable, it is narrowed to what
          is enforceable and the rest stands. Not enforcing a right once does
          not waive it.
        </p>
        <h3>Notices</h3>
        <p>
          Notices to you go to the email on your account or into the console.
          Notices to us go to {CONTACT}, and are effective when we acknowledge
          them or on the next business day after delivery, whichever is earlier.
        </p>
        <h3>No third-party beneficiaries, no partnership</h3>
        <p>
          Only you and we may enforce this agreement. Nothing in it creates a
          partnership, joint venture, agency or employment relationship, and
          neither of us may bind the other.
        </p>
        <h3>Force majeure</h3>
        <p>
          Neither of us is liable for a delay or failure caused by something
          outside its reasonable control, including a failure of a network, a
          cloud provider or the Model Provider. Payment obligations already due
          are not excused.
        </p>
        <h3>Export and sanctions</h3>
        <p>
          You will comply with export control and sanctions laws that apply to
          your use of the Service, and you confirm you are not located in, or
          acting for anyone in, a territory those laws prohibit us from serving.
        </p>
        <h3>Language</h3>
        <p>
          These terms are written in English. A translation is provided for
          convenience only; where it differs, the English text governs.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          This agreement is governed by the laws of {JURISDICTION}, without
          regard to conflict-of-laws rules. The United Nations Convention on
          Contracts for the International Sale of Goods does not apply.
        </p>
        <p>
          Before filing anything, tell us what the dispute is at {CONTACT} and
          give us thirty days to resolve it. If that fails, {VENUE} has
          exclusive jurisdiction, and each of us submits to it.
        </p>
        <p>
          Nothing in this section removes a right you have as a consumer to
          bring proceedings where you live, and either of us may seek injunctive
          relief in any competent court to protect its intellectual property or
          confidential information.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <>
        <p>
          We may update these terms as the Service changes. For a material
          change we will give notice — in the console or by email — at least
          thirty days before it takes effect, and the effective date and version
          at the top of this page will change with it.
        </p>
        <p>
          Continuing to use the Service after the new terms take effect means
          you accept them. If you do not, close your account before that date;
          where you paid in advance, we will refund the unused part of the
          period.
        </p>
        <p>
          Minor changes — fixing a typo, clarifying wording that does not alter
          an obligation, or naming a new contact address — take effect when
          posted.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>
          Questions about these terms, and any notice they require you to give
          us, go to <strong>{CONTACT}</strong>.
        </p>
        <p>
          Suspected vulnerabilities, exposed credentials and anything else that
          cannot wait go to <strong>{SECURITY_CONTACT}</strong>.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="page">
      <header className="page-head rise">
        <div>
          <p className="eyebrow">Legal</p>
          <h1>Terms of Use</h1>
          <p className="page-lede">
            The terms governing use of SC4SAP and the systems it connects to.
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
            <b>Provider</b> {PROVIDER}
          </li>
        </ul>

        <p className="notice-block">{DRAFT_NOTICE}</p>

        <p className="legal-intro">
          Read section 5 before you connect an SAP system, section 8 before you
          approve anything, and section 10 before you ship what a Skill wrote.
          Those three carry most of what you are agreeing to.
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
