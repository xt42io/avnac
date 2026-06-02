import {
  CropIcon,
  FileExportIcon,
  GeometricShapes02Icon,
  Image01Icon,
  TextBoldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import doodleSvgRaw from "../assets/doodle.svg?raw";
import NewCanvasDialog from "../components/new-canvas-dialog";
import { useAnalytics } from "../lib/analytics";
import { idbListDocuments } from "../lib/avnac-editor-idb";

export const Route = createFileRoute("/")({ component: Landing });

type Sticker = {
  id: string;
  src: string;
  label: string;
  rotation: number;
  size: string;
  desktop: {
    x: number;
    y: number;
  };
  mobile: {
    x: number;
    y: number;
  };
};

const initialStickers: Sticker[] = [
  {
    id: "sunflower",
    src: "/stickers/sunflower-badge.webp",
    label: "Sunflower sticker",
    rotation: 6,
    size: "clamp(5.6rem, 10.8vw, 8.8rem)",
    desktop: { x: 74, y: 12 },
    mobile: { x: 37, y: 15 },
  },
  {
    id: "star",
    src: "/stickers/shooting-star-badge.webp",
    label: "Shooting star sticker",
    rotation: -7,
    size: "clamp(4.4rem, 8.8vw, 7.4rem)",
    desktop: { x: 9, y: 12 },
    mobile: { x: 7, y: 16 },
  },
  {
    id: "pineapple",
    src: "/stickers/pineapple.webp",
    label: "Pineapple sticker",
    rotation: 7,
    size: "clamp(5.4rem, 11.2vw, 9.1rem)",
    desktop: { x: 77, y: 70 },
    mobile: { x: 68, y: 74 },
  },
  {
    id: "donut",
    src: "/stickers/donut.webp",
    label: "Donut sticker",
    rotation: -8,
    size: "clamp(4.9rem, 9.6vw, 8rem)",
    desktop: { x: 16, y: 73 },
    mobile: { x: 8, y: 76 },
  },
  {
    id: "lollipop",
    src: "/stickers/lollipop.webp",
    label: "Lollipop sticker",
    rotation: 12,
    size: "clamp(4.1rem, 8vw, 6.5rem)",
    desktop: { x: 80, y: 45 },
    mobile: { x: 72, y: 15 },
  },
  {
    id: "leaf",
    src: "/stickers/leaf.webp",
    label: "Leaf sticker",
    rotation: -11,
    size: "clamp(4rem, 7.8vw, 6.2rem)",
    desktop: { x: 11, y: 47 },
    mobile: { x: 40, y: 77 },
  },
];

type EssentialTool = {
  name: string;
  note: string;
  icon: IconSvgElement;
  accent: string;
  accentSoft: string;
};

const essentialTools: EssentialTool[] = [
  {
    name: "Text",
    note: "Type, hierarchy, and alignment.",
    icon: TextBoldIcon,
    accent: "#ef8b74",
    accentSoft: "rgba(239, 139, 116, 0.22)",
  },
  {
    name: "Shapes",
    note: "Clean primitives for quick composition.",
    icon: GeometricShapes02Icon,
    accent: "#f0a74b",
    accentSoft: "rgba(240, 167, 75, 0.22)",
  },
  {
    name: "Images",
    note: "Drop in assets and build around them.",
    icon: Image01Icon,
    accent: "#89a36f",
    accentSoft: "rgba(137, 163, 111, 0.2)",
  },
  {
    name: "Crop",
    note: "Trim the frame without losing the energy.",
    icon: CropIcon,
    accent: "#5d9bc7",
    accentSoft: "rgba(93, 155, 199, 0.2)",
  },
  {
    name: "Export",
    note: "Push the final image out when it lands.",
    icon: FileExportIcon,
    accent: "#f17f8f",
    accentSoft: "rgba(241, 127, 143, 0.18)",
  },
];

// const magicPromptExamples = [
//   "Turn this into a bold festival flyer with tighter spacing.",
//   "Rewrite the headline and make the layout feel more editorial.",
//   "Give this poster a softer color story and cleaner rhythm.",
// ];

// const magicCapabilities = [
//   {
//     label: "First pass",
//     title: "Start from a rough idea.",
//     note: "Drop in a prompt and get a sharper direction before you start nudging the details.",
//   },
//   {
//     label: "Rewrite",
//     title: "Fix the words and the structure.",
//     note: "Ask for punchier copy, better hierarchy, or a cleaner arrangement without leaving the canvas.",
//   },
//   {
//     label: "Refine",
//     title: "Keep iterating in place.",
//     note: "Use Magic to push a layout further instead of starting over every time the vibe is slightly off.",
//   },
// ];

type DragState = {
  mode: "drag" | "rotate";
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
  startRotation: number;
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function useCompactHeroStickerLayout() {
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return compact;
}

function Landing() {
  const navigate = Route.useNavigate();
  const [newCanvasOpen, setNewCanvasOpen] = useState(false);
  const [savedFileCount, setSavedFileCount] = useState<number | null>(null);
  const [stickers, setStickers] = useState(initialStickers);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [activeToolIndex, setActiveToolIndex] = useState(0);
  const analytics = useAnalytics();
  const stickerLayerRef = useRef<HTMLDivElement | null>(null);
  const toolsSectionRef = useRef<HTMLDivElement | null>(null);
  const vectorsSectionRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const activeToolIndexRef = useRef(0);
  const compactHeroStickerLayout = useCompactHeroStickerLayout();
  const vectorsInView = useInView(vectorsSectionRef, {
    once: true,
    amount: 0.35,
  });
  const { scrollYProgress } = useScroll({
    target: toolsSectionRef,
    offset: ["start start", "end end"],
  });
  const smoothToolsProgress = useSpring(scrollYProgress, {
    stiffness: 210,
    damping: 32,
    mass: 0.22,
  });
  const trackX = useTransform(
    smoothToolsProgress,
    [0, 1],
    ["0%", `-${((essentialTools.length - 1) * 100) / essentialTools.length}%`],
  );

  useEffect(() => {
    let cancelled = false;
    void idbListDocuments()
      .then((docs) => {
        if (!cancelled) setSavedFileCount(docs.length);
      })
      .catch(() => {
        if (!cancelled) setSavedFileCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useMotionValueEvent(smoothToolsProgress, "change", (latest) => {
    const nextIndex = Math.min(
      essentialTools.length - 1,
      Math.max(
        0,
        Math.round(latest * Math.max(essentialTools.length - 1, 1)),
      ),
    );
    const previousIndex = activeToolIndexRef.current;
    if (nextIndex === previousIndex) {
      return;
    }
    activeToolIndexRef.current = nextIndex;
    setActiveToolIndex(nextIndex);
  });

  const updateStickerPosition = useCallback((
    stickerId: string,
    clientX: number,
    clientY: number,
  ) => {
    const layer = stickerLayerRef.current;
    const dragState = dragStateRef.current;
    if (!layer || !dragState || dragState.id !== stickerId) {
      return;
    }

    if (dragState.mode === "rotate") {
      const pointerAngle = Math.atan2(
        clientY - dragState.centerY,
        clientX - dragState.centerX,
      );
      const rotation =
        dragState.startRotation +
        radiansToDegrees(pointerAngle - dragState.startPointerAngle);

      setStickers((current) =>
        current.map((sticker) =>
          sticker.id === stickerId ? { ...sticker, rotation } : sticker,
        ),
      );
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const positionKey = compactHeroStickerLayout ? "mobile" : "desktop";
    const nextLeft = clamp(
      dragState.startLeft + (clientX - dragState.startClientX),
      0,
      Math.max(layerRect.width - dragState.width, 0),
    );
    const nextTop = clamp(
      dragState.startTop + (clientY - dragState.startClientY),
      0,
      Math.max(layerRect.height - dragState.height, 0),
    );

    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === stickerId
          ? {
              ...sticker,
              [positionKey]: {
                x: (nextLeft / Math.max(layerRect.width, 1)) * 100,
                y: (nextTop / Math.max(layerRect.height, 1)) * 100,
              },
            }
          : sticker,
      ),
    );
  }, [compactHeroStickerLayout]);

  const endDrag = (pointerId: number, target: EventTarget | null) => {
    if (dragStateRef.current?.pointerId !== pointerId) {
      return;
    }

    if (target instanceof HTMLElement && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    dragStateRef.current = null;
    setActiveStickerId(null);
  };

  const openEditor = useCallback(() => {
    void (async () => {
      try {
        const docs = await idbListDocuments();
        setSavedFileCount(docs.length);
        const destination = docs.length > 0 ? "/files" : "/create";
        analytics.editorOpened({
          source: "landing_hero",
          destination,
          existing_file_count: docs.length,
        });
        if (docs.length > 0) {
          await navigate({ to: "/files" });
          return;
        }
      } catch (err) {
        analytics.captureError(err);
      }
      setNewCanvasOpen(true);
    })();
  }, [navigate, analytics]);

  const hasSavedFiles = (savedFileCount ?? 0) > 0;
  const primaryCtaLabel = hasSavedFiles ? "Open files" : "Open editor";
  const heroBody = hasSavedFiles
    ? "You already have saved work in this browser. Open your files and keep editing."
    : "Avnac is an open canvas for layouts, posters, and graphics.";
  const activeTool = essentialTools[activeToolIndex];
  const activeToolCount = String(activeToolIndex + 1).padStart(2, "0");
  const totalToolCount = String(essentialTools.length).padStart(2, "0");
  const toolsShellStyle = {
    "--tool-count": essentialTools.length,
    "--tool-accent": activeTool.accent,
    "--tool-accent-soft": activeTool.accentSoft,
    minHeight: `${essentialTools.length * 68}vh`,
  } as CSSProperties;
  const doodleMarkup = useMemo(() => {
    let pathIndex = 0;

    return doodleSvgRaw
      .replace(/<\?xml[\s\S]*?\?>\s*/g, "")
      .replace(/<svg\b([^>]*)>/, (_match, attrs) => {
        const cleanAttrs = attrs
          .replace(/\swidth="[^"]*"/g, "")
          .replace(/\sheight="[^"]*"/g, "");
        const withViewBox = /viewBox=/.test(cleanAttrs)
          ? cleanAttrs
          : `${cleanAttrs} viewBox="0 0 1000 1000"`;

        return `<svg${withViewBox}>`;
      })
      .replace(
        /<path\b([^>]*?)fill="([^"]+)"([^>]*)\/>/g,
        (_match, before, fill, after) => {
          const nextIndex = pathIndex++;

          return `<path${before}fill="${fill}"${after} pathLength="1" style="--path-index:${nextIndex}; --path-fill:${fill};" />`;
        },
      );
  }, []);

  return (
    <main className="landing-page">
      <section className="hero-page relative flex min-h-[100dvh] flex-col justify-center overflow-hidden px-5 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
        <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
        <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div ref={stickerLayerRef} className="hero-sticker-layer" aria-hidden="true">
          {stickers.map((sticker) => (
            (() => {
              const pos = compactHeroStickerLayout
                ? sticker.mobile
                : sticker.desktop;

              return (
                <div
                  key={sticker.id}
                  className={`hero-sticker-frame ${activeStickerId === sticker.id ? "is-active" : ""}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: sticker.size,
                    transform: `rotate(${sticker.rotation}deg)`,
                    zIndex: activeStickerId === sticker.id ? 3 : 1,
                  }}
                  onPointerDown={(e) => {
                    const layer = stickerLayerRef.current;
                    if (!layer) {
                      return;
                    }

                    const layerRect = layer.getBoundingClientRect();
                    const stickerLeft =
                      (pos.x / 100) * Math.max(layerRect.width, 1);
                    const stickerTop =
                      (pos.y / 100) * Math.max(layerRect.height, 1);

                    dragStateRef.current = {
                      mode: "drag",
                      id: sticker.id,
                      pointerId: e.pointerId,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startLeft: stickerLeft,
                      startTop: stickerTop,
                      startRotation: sticker.rotation,
                      centerX:
                        e.currentTarget.getBoundingClientRect().left +
                        e.currentTarget.offsetWidth / 2,
                      centerY:
                        e.currentTarget.getBoundingClientRect().top +
                        e.currentTarget.offsetHeight / 2,
                      startPointerAngle: 0,
                      width: e.currentTarget.offsetWidth,
                      height: e.currentTarget.offsetHeight,
                    };
                    setActiveStickerId(sticker.id);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    updateStickerPosition(sticker.id, e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    endDrag(e.pointerId, e.target);
                  }}
                  onPointerCancel={(e) => {
                    endDrag(e.pointerId, e.target);
                  }}
                >
                  <span className="hero-sticker-selection" />
                  <span className="hero-sticker-handle hero-sticker-handle-nw" />
                  <span
                    className="hero-sticker-rotation-arm"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const frame = e.currentTarget.parentElement;
                      if (!frame) {
                        return;
                      }

                      const frameRect = frame.getBoundingClientRect();
                      const centerX = frameRect.left + frameRect.width / 2;
                      const centerY = frameRect.top + frameRect.height / 2;

                      dragStateRef.current = {
                        mode: "rotate",
                        id: sticker.id,
                        pointerId: e.pointerId,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        startLeft: 0,
                        startTop: 0,
                        startRotation: sticker.rotation,
                        centerX,
                        centerY,
                        startPointerAngle: Math.atan2(
                          e.clientY - centerY,
                          e.clientX - centerX,
                        ),
                        width: frameRect.width,
                        height: frameRect.height,
                      };
                      setActiveStickerId(sticker.id);
                      frame.setPointerCapture(e.pointerId);
                    }}
                  >
                    <span className="hero-sticker-rotation-handle" />
                  </span>
                  <span className="hero-sticker-handle hero-sticker-handle-ne" />
                  <span className="hero-sticker-handle hero-sticker-handle-e" />
                  <span className="hero-sticker-handle hero-sticker-handle-se" />
                  <span className="hero-sticker-handle hero-sticker-handle-s" />
                  <span className="hero-sticker-handle hero-sticker-handle-sw" />
                  <span className="hero-sticker-handle hero-sticker-handle-w" />
                  <img
                    src={sticker.src}
                    alt={sticker.label}
                    className="hero-sticker-image"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </div>
              );
            })()
          ))}
        </div>
        <div className="relative z-[1] mx-auto w-full max-w-3xl">
          <div className="rise-in text-left">
            <h1 className="display-title hero-headline mb-8 font-medium text-balance text-[var(--text)] sm:mb-10 lg:mb-12">
              Design in the browser,
              <br />
              openly.
            </h1>
            <p className="mb-10 max-w-xl text-lg leading-[1.6] text-[var(--text-muted)] sm:mb-12 sm:text-xl sm:leading-[1.55] lg:text-[1.375rem] lg:leading-[1.5]">
              {heroBody}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="bg-black text-white inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-0 px-10 py-3.5 text-base font-medium sm:min-h-14 sm:px-12 sm:py-4 sm:text-[1.0625rem]"
                onClick={openEditor}
              >
                {primaryCtaLabel}
              </button>
              <Link
                to="/studio"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/[0.14] bg-white/85 px-8 py-3.5 text-base font-medium text-[var(--text)] no-underline backdrop-blur-sm hover:border-black/[0.22] hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]"
              >
                Avnac Studio
              </Link>
              <a
                href="https://github.com/akinloluwami/avnac"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/[0.14] bg-white/70 px-8 py-3.5 text-base font-medium text-[var(--text)] no-underline backdrop-blur-sm hover:border-black/[0.22] hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]"
              >
                GitHub
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
              <span>Want to back the project?</span>
              <Link
                to="/sponsor"
                className="inline-flex items-center rounded-full border border-black/[0.1] bg-white/70 px-4 py-2 font-medium text-[var(--text)] no-underline backdrop-blur-sm hover:border-black/[0.18] hover:bg-white"
              >
                Sponsor Avnac
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <motion.div
            ref={toolsSectionRef}
            className="landing-tools-shell"
            style={toolsShellStyle}
          >
            <div className="landing-tools-sticky">
              <div className="landing-tools-header">
                <div className="landing-tools-headline">
                  <h2 className="display-title landing-tools-title">
                    All the essential tools.
                  </h2>
                </div>

                <div className="landing-tools-meter" aria-hidden="true">
                  <span>{activeToolCount}</span>
                  <div className="landing-tools-meter-bar">
                    <motion.span
                      className="landing-tools-meter-fill"
                      style={{ scaleX: smoothToolsProgress }}
                    />
                  </div>
                  <span>{totalToolCount}</span>
                </div>
              </div>

              <div className="landing-tools-reel-frame" aria-live="polite">
                <motion.div
                  className="landing-tools-reel-track"
                  style={{
                    width: `${essentialTools.length * 100}%`,
                    x: trackX,
                  }}
                >
                  {essentialTools.map((tool, index) => {
                    const isActive = index === activeToolIndex;

                    return (
                      <article
                        key={tool.name}
                        className={`landing-tools-panel ${isActive ? "is-active" : ""}`}
                        style={
                          {
                            "--panel-accent": tool.accent,
                          } as CSSProperties
                        }
                      >
                        <div className="landing-tools-panel-grid">
                          <div className="landing-tools-panel-copy">
                            <span className="landing-tools-panel-count">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <h3 className="display-title">{tool.name}</h3>
                            <p>{tool.note}</p>
                          </div>

                          <motion.div
                            className="landing-tools-panel-icon-wrap"
                            animate={{
                              scale: isActive ? 1 : 0.88,
                              rotate: isActive ? 0 : index % 2 === 0 ? -8 : 8,
                              y: isActive ? 0 : 20,
                              opacity: isActive ? 1 : 0.7,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 360,
                              damping: 28,
                            }}
                          >
                            <HugeiconsIcon
                              icon={tool.icon}
                              size={310}
                              strokeWidth={1.7}
                              className="landing-tools-panel-icon"
                              style={{ color: tool.accent }}
                            />
                          </motion.div>
                        </div>
                      </article>
                    );
                  })}
                </motion.div>
              </div>

              <div className="landing-tools-strip" aria-hidden="true">
                {essentialTools.map((tool, index) => (
                  <span
                    key={tool.name}
                    className={`landing-tools-strip-item ${index === activeToolIndex ? "is-active" : ""}`}
                  >
                    {tool.name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section
        ref={vectorsSectionRef}
        className="landing-section landing-vectors-section"
      >
        <div className="landing-container">
          <div className="landing-vectors-shell">
            <div className="landing-vectors-header">
              <h2 className="display-title landing-vectors-title">
                Vectors
              </h2>
              <p className="landing-vectors-copy">
                Every curve stays sharp, editable, and clean as the drawing
                comes to life.
              </p>
            </div>

            <div
              className={`landing-vectors-stage ${vectorsInView ? "is-visible" : ""}`}
            >
              <div className="landing-vectors-paper">
                <div className="landing-vectors-paper-clip" aria-hidden="true" />
                <div
                  className="landing-vectors-doodle"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: doodleMarkup }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-magic-shell">
            <div className="landing-ai-header">
              <h2 className="display-title landing-section-title">Magic</h2>
              <p className="landing-section-copy">
                Prompt a first pass, rewrite the weak parts, or steer the
                layout toward a better mood without breaking your flow.
              </p>
            </div>

            <div className="landing-magic-grid">
              <div className="landing-magic-prompt-card">
                <span className="landing-magic-prompt-label">
                  Try prompts like
                </span>
                <div className="landing-ai-prompt-list">
                  {magicPromptExamples.map((prompt) => (
                    <span key={prompt}>{prompt}</span>
                  ))}
                </div>
              </div>

              <div className="landing-magic-card-list">
                {magicCapabilities.map((item) => (
                  <article key={item.title} className="landing-magic-card">
                    <span className="landing-magic-prompt-label">
                      {item.label}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.note}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      */}

      <section className="landing-section landing-section-last">
        <div className="landing-container">
          <div className="landing-cta-band landing-cta-band-only">
            <div>
              <h2 className="display-title landing-cta-title">
                Start making something.
              </h2>
            </div>

            <div className="landing-cta-actions">
              <button
                type="button"
                className="landing-primary-button inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-0 px-10 py-3.5 text-base font-medium sm:min-h-14 sm:px-12 sm:py-4 sm:text-[1.0625rem]"
                onClick={openEditor}
              >
                Open editor
              </button>
              <a
                href="https://github.com/akinloluwami/avnac"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/[0.14] bg-white/72 px-8 py-3.5 text-base font-medium text-[var(--text)] no-underline backdrop-blur-sm hover:border-black/[0.22] hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <NewCanvasDialog
        open={newCanvasOpen}
        onClose={() => setNewCanvasOpen(false)}
      />
    </main>
  );
}
