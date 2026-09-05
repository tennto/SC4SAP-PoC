/**
 * The app's one "still working" mark.
 *
 * A point running a ring, with a tail behind it that lengthens and shortens as
 * it goes, and a second, fainter sweep going the other way inside it. Three
 * bouncing dots would have done the job, but they read as a chat client's
 * typing indicator — and this is on screen for the better part of a minute
 * while a skill runs, so the thing being watched should be worth watching.
 *
 * The tail is what makes it worth watching. A mark that only turns is legible
 * in a second and then repeats forever; this one is also breathing, on a
 * period that does not divide into its rotation, so the shape coming round is
 * never quite the shape that went past.
 *
 * Every edge on it is hard. A blurred copy underneath was tried and taken back
 * out: at this size the halo does not read as light, it reads as the mark
 * being out of focus.
 *
 * Geometry only, and in the app's one ink: it has no more to say than "still
 * working", so it says it with movement rather than with colour.
 *
 * Divs and `conic-gradient` rather than SVG, because every part of this is a
 * fade along an arc and SVG has no gradient that runs that way. The layers,
 * their speeds and the breathing are all in `globals.css`.
 *
 * Its own component rather than a private one inside the setup wizard, so the
 * next screen that has to say "working" for a minute has this to reach for.
 * The transcript deliberately does not: an answer arriving is a different kind
 * of wait — seconds, inline, in a column of text — and it uses three dots,
 * which is the one place that reading is right.
 */
export function WorkingMark({
  label = "Working",
}: {
  /**
   * `role="img"` with a label rather than `aria-hidden`: this is the one thing
   * on screen saying work is in progress, and what contains it is `aria-busy`
   * but silent.
   */
  label?: string;
}) {
  return (
    <span className="work-mark" role="img" aria-label={label}>
      {/* Painted in this order: the course, the slow counter-sweep, the sweep
          itself, and the head on top of it. */}
      <span className="work-mark-track" aria-hidden="true" />
      <span className="work-mark-under" aria-hidden="true" />
      <span className="work-mark-comet" aria-hidden="true" />
      <span className="work-mark-head" aria-hidden="true" />
    </span>
  );
}
