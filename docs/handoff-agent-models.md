# Where an analyze-symptom run's money actually goes

Measured 2026-09-24 against the PoC backend, S/4HANA 758, the same ST22
screenshot as the only input each time. Written for whoever picks up model
selection in the next plugin release.

## The main thread is not the bill

Running the whole session on Haiku changed almost nothing, because the session's
model only governs the orchestrator. The investigation happens in the
`sap-debugger` sub-agent, and that is where the tokens are.

| run | session model | reported cost | where it landed |
|---|---|---|---|
| 1 | Haiku 4.5 | $0.8228 | all of it on Sonnet |
| 2 | Haiku 4.5 | $0.6704 | $0.5177 Sonnet, $0.1528 Haiku |

A model picker that moves only the main thread is a promise the app cannot
keep. The skill dialog already lets someone choose Haiku for a run; the
sub-agent ignores it.

## Every agent pins its own model, and all of them are a generation behind

All 26 files in `plugin_module/agents/` carry a `model:` line:

| pinned model | agents | input $/MTok | output $/MTok |
|---|---|---|---|
| `claude-opus-4-7` | 20 | 5.00 | 25.00 |
| `claude-sonnet-4-6` | 5 | 3.00 | 15.00 |
| `claude-haiku-4-5` | 1 | 1.00 | 5.00 |

Current generation, for comparison: Sonnet 5 is $2.00 / $10.00 and Haiku 4.5 is
$1.00 / $5.00. `sap-debugger` — the agent that does the dump work — is pinned to
`claude-sonnet-4-6`, which costs 50% more per input token than Sonnet 5 and is
the older model.

Moving that one agent from 4.6 to 5 is about a third off an analyze-symptom
run, with no behavioural question to answer. Moving it to Haiku is about two
thirds off, and the quality evidence for that is below.

## Haiku's report was not worse

One run with Haiku as the orchestrator produced a better write-up than the
Sonnet runs it was compared against: it noticed the dump's "(Source code
changed)" flag, compared both function module interfaces field by field,
identified the one-digit name typo (`ZDEMO_RFC` where `ZDEMO_RFC1` was meant),
and flagged an unrelated naming-collision risk in `$TMP`. The work is retrieval
and comparison rather than deep reasoning, which is the shape Haiku is good at.

The escalation path is the safety net that makes starting cheap safe: a round
that cannot establish the cause returns `BLOCKED — needs full` and is
re-dispatched on Opus with its findings, so nothing is fetched twice.

## One unexplained observation, worth resolving before trusting any of this

In run 2 the sub-agent's cost was attributed to **`claude-sonnet-5`**, not to
the `claude-sonnet-4-6` its frontmatter pins. So either the pin does not take
effect, or the attribution is wrong. Both matter: the first means agent
frontmatter is not the lever it looks like, the second means these figures
describe a model that never ran.

A PoC-side override was written and then reverted rather than shipped. It
worked on an agent with no pinned model — a dispatch asking for Sonnet was
billed entirely to Haiku — and did nothing observable on `sap-debugger`. With
every plugin agent pinned and chat carrying no dispatch tool at all, it had no
live effect to justify a third place where the model gets decided.

## Suggested order

1. Resolve the attribution question above — it decides whether frontmatter is
   the right place to change anything.
2. Move `sap-debugger` off `claude-sonnet-4-6`. Sonnet 5 is the no-argument
   step; Haiku is the one worth measuring against the evidence here.
3. Only then consider whether the app should clamp a sub-agent to its session's
   model, and if so, leave an explicit Opus dispatch alone so the `BLOCKED —
   needs full` escalation survives.
