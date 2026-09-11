"use client";

/**
 * A horizontal scrollbar for something that scrolls sideways.
 *
 * The platform will not provide one worth having here. On a touch device its
 * bar is an overlay — invisible until the moment someone already knows to
 * scroll, which is too late to be the thing that tells them — and a mouse
 * cannot drag a scroll container at all, so on a desktop browser, and in the
 * phone-preview extensions people check layouts with, a sideways scroller
 * looks scrollable and cannot be reached. `::-webkit-scrollbar` is not an
 * answer either: iOS ignores it for overlay bars.
 *
 * So this measures the element and draws its own, which can also be grabbed.
 *
 * Deliberately redundant: the target already scrolls by wheel, by swipe and by
 * keyboard. This is a pointer affordance on top of those rather than the only
 * way through, which is why it stays out of the accessibility tree instead of
 * claiming to be a slider.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

type Props = {
  /** The element that scrolls. Watched for size and scroll position. */
  targetRef: RefObject<HTMLElement | null>;
  /** Placement, per use — the bar itself looks the same everywhere. */
  className?: string;
};

export function DragScrollBar({ targetRef, className }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  /**
   * Thumb width and offset as percentages of the track, or null when
   * everything fits — absent rather than a thumb that fills the track and
   * means nothing.
   */
  const [thumb, setThumb] = useState<{ size: number; offset: number } | null>(
    null,
  );

  /**
   * Measure, and only change state when the numbers actually changed.
   *
   * The equality check is not an optimisation. A `ResizeObserver` fires when
   * it starts observing and again on any layout change, and handing `setThumb`
   * a freshly built object every time makes each of those a re-render — which
   * can lay the page out again, which fires the observer again. That is a loop
   * with no exit, and React ends it by throwing "Maximum update depth
   * exceeded". Returning the *same* object tells React there is nothing to do.
   *
   * Rounded for the same reason: sub-pixel widths drift by fractions that are
   * invisible on screen and would otherwise count as a change forever.
   */
  const measure = useCallback(() => {
    const element = targetRef.current;
    if (!element) return;
    const { clientWidth, scrollWidth, scrollLeft } = element;

    // A pixel of slack: sub-pixel layout leaves a scrollWidth a hair over the
    // clientWidth on content that plainly fits.
    if (scrollWidth <= clientWidth + 1) {
      setThumb((current) => (current === null ? current : null));
      return;
    }

    const size = Math.round((clientWidth / scrollWidth) * 1000) / 10;
    const offset = Math.round((scrollLeft / scrollWidth) * 1000) / 10;
    setThumb((current) =>
      current && current.size === size && current.offset === offset
        ? current
        : { size, offset },
    );
  }, [targetRef]);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    // Content arriving, content leaving, or the window turning sideways all
    // change whether there is anything to scroll. A code block streaming in is
    // the case that matters: it grows a line at a time.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, targetRef]);

  const scrubTo = useCallback(
    (clientX: number) => {
      const element = targetRef.current;
      const track = trackRef.current;
      if (!element || !track) return;
      const box = track.getBoundingClientRect();
      if (box.width === 0) return;
      const visible = element.clientWidth / element.scrollWidth;
      // The *middle* of the thumb goes under the pointer, so the content does
      // not jump by half a thumb the instant the bar is grabbed.
      const fraction = (clientX - box.left) / box.width - visible / 2;
      const maxScroll = element.scrollWidth - element.clientWidth;
      element.scrollLeft =
        Math.max(0, Math.min(1, fraction / (1 - visible))) * maxScroll;
    },
    [targetRef],
  );

  /**
   * Whether a drag is in flight, as a ref as well as state.
   *
   * The ref is what the move handler reads. State alone does not work: the
   * handler closes over the render it was created in, so the first `pointermove`
   * after `pointerdown` still sees `dragging === false` and does nothing — and
   * a drag synthesised as one or two moves is then swallowed whole. The state
   * copy exists only to re-render for the `dragging` class.
   */
  const draggingRef = useRef(false);

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      // Best effort: keeps a drag alive when it wanders off a 5px bar. It
      // throws for a pointer id the browser is not tracking, which is every
      // synthesised event, and that must not take the drag down with it —
      // the window listeners below are what actually carry it.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // No capture; the drag still works, it just ends if the pointer
        // leaves the window.
      }
      draggingRef.current = true;
      setDragging(true);
      scrubTo(event.clientX);
    },
    [scrubTo],
  );

  /**
   * Move and release are watched on the window rather than on the bar.
   *
   * Pointer capture is supposed to make that unnecessary, and mostly does —
   * but it is the one part of this that silently does nothing when it fails,
   * and a scrollbar that stops responding halfway through a drag is worse
   * than one that never started.
   */
  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      if (draggingRef.current) scrubTo(event.clientX);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [dragging, scrubTo, stopDragging]);

  if (!thumb) return null;

  return (
    <div
      ref={trackRef}
      className={`drag-scrollbar${dragging ? " dragging" : ""}${
        className ? ` ${className}` : ""
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => {
        // The ref, not the state: see `draggingRef`.
        if (draggingRef.current) scrubTo(event.clientX);
      }}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      aria-hidden="true"
    >
      <span style={{ width: `${thumb.size}%`, left: `${thumb.offset}%` }} />
    </div>
  );
}
