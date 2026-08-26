"use client";

/**
 * A video that loops without the seam.
 *
 * The `loop` attribute makes the browser seek back to zero and restart the
 * decoder, and that costs a few frames — visible as a hitch every time the
 * clip comes round. There is no attribute that smooths it, so the loop is
 * built out of two elements instead: while one is playing out its last
 * `OVERLAP_MS` the other starts from the top, hidden, and the visible one is
 * switched once the incoming copy is actually showing something.
 *
 * That last part is the whole trick. Swapping the moment `play()` is called
 * is what produces a flash: the element has been seeked but has not painted a
 * frame yet, so for an instant what is on screen is the empty element — the
 * plate's background — rather than the video. So the switch waits for the
 * incoming copy to present its first frame, and the outgoing one keeps
 * playing until it does.
 *
 * The hidden copy is also left seeked to zero between turns, so by the time
 * its turn comes the frame it needs is already decoded.
 *
 * The opacity is written to the DOM rather than held in state: the handoff is
 * driven by playback position on every frame, and re-rendering the tree for it
 * would be work spent to arrive at the same two style values.
 */
import { useEffect, useRef } from "react";

/**
 * How early the incoming copy starts before the outgoing one runs out.
 *
 * Read this as a budget rather than as a duration the two are both on screen
 * for: the switch happens the moment the incoming copy paints, so what this
 * number buys is room for that to take a while.
 *
 * And it does. The copy being started has been paused for a whole lap of the
 * clip, long enough that the browser has let its decoder go idle, so `play()`
 * is a pipeline resume and not a resumption of playback — tens of
 * milliseconds when it goes well, and not reliably that. Spending the budget
 * costs nothing visible, because the outgoing copy is playing normally the
 * entire time it is being spent; running out of it does cost something, since
 * then the outgoing copy is at its end with nowhere to go. So this is set
 * long, and being generous with it is free.
 */
const OVERLAP_MS = 600;

/** `readyState` at which an element has a frame for its current position. */
const HAVE_CURRENT_DATA = 2;

/** `requestVideoFrameCallback` is not in the DOM lib TypeScript ships. */
type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export function LoopingVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const first = useRef<HTMLVideoElement>(null);
  const second = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const pair = [first.current, second.current];
    if (!pair[0] || !pair[1]) return;
    const videos = pair as HTMLVideoElement[];

    /** Index of the copy currently visible. */
    let live = 0;
    /** True from the moment a handoff starts until the switch has happened. */
    let handing = false;
    let frame = 0;
    let stopWaiting: (() => void) | null = null;

    /** Leaves a copy holding its first frame, decoded and ready to show. */
    function rewind(video: HTMLVideoElement): void {
      if (video.currentTime !== 0) video.currentTime = 0;
    }

    /** Calls back once `video` has actually presented a frame. */
    function onFirstFrame(
      video: HTMLVideoElement,
      done: () => void,
    ): () => void {
      const framed = video as FrameVideo;
      if (typeof framed.requestVideoFrameCallback === "function") {
        const handle = framed.requestVideoFrameCallback(done);
        return () => framed.cancelVideoFrameCallback?.(handle);
      }
      // Firefox has no frame callback. `playing` fires a little early — before
      // the first frame is necessarily on screen — so give it one more frame.
      const listener = () => {
        video.removeEventListener("playing", listener);
        requestAnimationFrame(done);
      };
      video.addEventListener("playing", listener);
      return () => video.removeEventListener("playing", listener);
    }

    /** Sends the copy on screen round again. The fallback for a handoff that
     *  cannot happen — the loop keeps running, just with a seam. */
    function restart(video: HTMLVideoElement): void {
      rewind(video);
      void video.play().catch(() => {});
    }

    function handoff(): void {
      if (handing) return;

      const coming = videos[1 - live];
      // The other copy has no frame to show yet. Both elements load the same
      // file, but they load on their own schedules and the hidden one is the
      // one a browser deprioritises — so this is reachable on a cold first
      // lap, not only on a broken load.
      if (coming.readyState < HAVE_CURRENT_DATA) {
        restart(videos[live]);
        return;
      }

      handing = true;
      rewind(coming);
      // Autoplay policy allows this — both copies are muted — but a rejected
      // promise is unhandled otherwise, and a failure here means a video that
      // stops rather than anything worth reporting.
      void coming.play().catch(() => {});

      // No deadline of its own: the deadline is the outgoing copy running out,
      // which `onEnded` is already watching for. A timer shorter than the lead
      // would give up while the copy on screen still had frames left to play,
      // and giving up means seeking that copy — on screen, where the seek is
      // the visible hitch this is all meant to avoid.
      stopWaiting = onFirstFrame(coming, swap);
    }

    /** Ends a handoff whose incoming copy never presented a frame: it goes
     *  back to being the hidden one, and the visible copy carries on. */
    function abort(): void {
      if (!handing) return;
      stopWaiting?.();
      stopWaiting = null;

      const coming = videos[1 - live];
      coming.pause();
      rewind(coming);
      handing = false;

      restart(videos[live]);
    }

    function swap(): void {
      if (!handing) return;
      stopWaiting?.();
      stopWaiting = null;

      const going = videos[live];
      const coming = videos[1 - live];

      coming.style.opacity = "1";
      going.style.opacity = "0";
      going.pause();
      // Hidden now, so it can take the seek cost here rather than at the
      // start of its next turn.
      rewind(going);

      live = 1 - live;
      handing = false;
    }

    // Per frame rather than on `timeupdate`, which fires about four times a
    // second — coarse enough that the handoff could land most of a quarter
    // second late and eat into the overlap it is supposed to start.
    function tick(): void {
      frame = requestAnimationFrame(tick);
      const current = videos[live];
      // Unknown until metadata lands.
      if (!Number.isFinite(current.duration)) return;
      if (current.duration - current.currentTime > OVERLAP_MS / 1000) return;
      handoff();
    }

    // The backstop for a frame loop that was not running — a background tab
    // stops `requestAnimationFrame` but not a muted video.
    function onEnded(event: Event): void {
      if (event.target !== videos[live]) return;
      // A handoff that had the whole lead to present a frame and did not. The
      // budget is spent — this copy is out of frames — so the handoff is the
      // thing to drop. Switching anyway would cut to a copy that is not
      // running yet, which is a held frame on screen either way and a torn
      // one at the far end of it.
      if (handing) {
        abort();
        return;
      }
      handoff();
    }

    for (const video of videos) video.addEventListener("ended", onEnded);
    rewind(videos[1]);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      stopWaiting?.();
      for (const video of videos) video.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <>
      {/* Neither copy carries `loop`: each one plays to its end, and the
          handoff above is what comes round. */}
      <video
        ref={first}
        className={className}
        src={src}
        style={{ opacity: 1 }}
        autoPlay
        muted
        playsInline
        preload="auto"
      />
      {/* Same file, so the second copy is served from cache rather than
          fetched again. It sits at zero opacity until its turn. */}
      <video
        ref={second}
        className={className}
        src={src}
        style={{ opacity: 0 }}
        muted
        playsInline
        preload="auto"
      />
    </>
  );
}
