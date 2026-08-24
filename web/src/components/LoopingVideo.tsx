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

/** How early the incoming copy starts before the outgoing one runs out. */
const OVERLAP_MS = 600;

/**
 * How long to wait for that first frame before switching anyway. Only reached
 * if the frame callback never fires — a video that was refused playback, say
 * — where a switch to a still element still beats a loop that has stopped.
 */
const FRAME_TIMEOUT_MS = 200;

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
    let timer = 0;
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

    function handoff(): void {
      if (handing) return;
      handing = true;

      const coming = videos[1 - live];
      rewind(coming);
      // Autoplay policy allows this — both copies are muted — but a rejected
      // promise is unhandled otherwise, and a failure here means a video that
      // stops rather than anything worth reporting.
      void coming.play().catch(() => {});

      stopWaiting = onFirstFrame(coming, swap);
      timer = window.setTimeout(swap, FRAME_TIMEOUT_MS);
    }

    function swap(): void {
      if (!handing) return;
      stopWaiting?.();
      stopWaiting = null;
      window.clearTimeout(timer);

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
      handoff();
    }

    for (const video of videos) video.addEventListener("ended", onEnded);
    rewind(videos[1]);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
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
