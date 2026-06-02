import {
  Add01Icon,
  ArrowUp01Icon,
  CloudUploadIcon,
  Coffee02Icon,
  Delete02Icon,
  Download01Icon,
  FavouriteIcon,
  FlipLeftIcon,
  Image01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { cx } from '../components/ui'
import { useAnalytics } from '../lib/analytics'
import { removeBackgroundFromFile } from '../lib/avnac-background-removal'
import { REMOVE_BG_FEATURE_ENABLED, REMOVE_BG_UNAVAILABLE_MESSAGE } from '../lib/feature-flags'
import {
  deleteRemoveBgHistoryItem,
  listRemoveBgHistory,
  putRemoveBgHistoryItem,
  type RemoveBgHistoryItem,
} from '../lib/remove-bg-history'
import {
  imageFilesFromTransfer,
  isImageFile,
  transferMayContainFiles,
} from '../scene-engine/primitives/files'

export const Route = createFileRoute('/remove-bg')({
  component: REMOVE_BG_FEATURE_ENABLED ? RemoveBgPage : RemoveBgUnavailablePage,
})

type RemoveBgStatus = 'empty' | 'processing' | 'done' | 'error'
type RemoveBgInputSource = 'file_picker' | 'paste' | 'drop'
type RemoveBgUploadSurface = 'landing' | 'history_strip'
type RemoveBgHistorySource = 'initial_restore' | 'history_strip'
type SponsorPromptCloseReason = 'remind_later' | 'backdrop' | 'escape'

const HISTORY_LIMIT = 12
const MAX_REMOVE_BG_FILE_SIZE_BYTES = 1_572_864
const MAX_REMOVE_BG_FILE_SIZE_LABEL = '1.5 MB'
const SPONSOR_PROMPT_STORAGE_KEY = 'avnac-remove-bg-sponsor-prompt-dismissed'

const checkerboardStyle: CSSProperties = {
  backgroundColor: '#fafafa',
  backgroundImage:
    'linear-gradient(45deg, rgba(0,0,0,0.045) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.045) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.045) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.045) 75%)',
  backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
  backgroundSize: '24px 24px',
}

function outputFilenameFor(file: File): string {
  const base =
    file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 80)
      .trim() || 'image'
  return `${base}-no-bg.png`
}

function fileFromHistoryBlob(blob: Blob, name: string): File {
  if (blob instanceof File) return blob
  return new File([blob], name || 'image.png', {
    type: blob.type || 'image/png',
    lastModified: Date.now(),
  })
}

function fileAnalyticsFor(file: File) {
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : null

  return {
    file_extension: extension || null,
    file_size: file.size,
    file_type: file.type || 'unknown',
  }
}

function readSponsorPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(SPONSOR_PROMPT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeSponsorPromptDismissed(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(SPONSOR_PROMPT_STORAGE_KEY, 'true')
  } catch {
    // Storage can fail in private windows; keep the UI usable either way.
  }
}

function RemoveBgPage() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const runIdRef = useRef(0)
  const dragDepthRef = useRef(0)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultFilename, setResultFilename] = useState('image-no-bg.png')
  const [status, setStatus] = useState<RemoveBgStatus>('empty')
  const [dragActive, setDragActive] = useState(false)
  const [compareHeld, setCompareHeld] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<RemoveBgHistoryItem[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [sponsorPromptOpen, setSponsorPromptOpen] = useState(false)
  const [sponsorPromptDismissed, setSponsorPromptDismissed] = useState(false)
  const analytics = useAnalytics()

  const showHistoryItem = useCallback(
    (
      item: RemoveBgHistoryItem,
      source: RemoveBgHistorySource = 'history_strip',
      historyCount?: number,
    ) => {
      runIdRef.current += 1
      setSourceFile(fileFromHistoryBlob(item.originalBlob, item.sourceName))
      setResultBlob(item.resultBlob)
      setResultFilename(item.filename)
      setStatus('done')
      setCompareHeld(false)
      setError(null)
      setSelectedHistoryId(item.id)
      analytics.removeBgHistorySelected({
        history_count: historyCount ?? null,
        item_age_ms: Math.max(0, Date.now() - item.createdAt),
        output_size: item.resultBlob.size,
        source,
      })
    },
    [analytics],
  )

  useEffect(() => {
    if (!sourceFile) {
      setSourcePreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(sourceFile)
    setSourcePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [sourceFile])

  useEffect(() => {
    if (!resultBlob) {
      setResultUrl(null)
      return
    }

    const url = URL.createObjectURL(resultBlob)
    setResultUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [resultBlob])

  useEffect(() => {
    setSponsorPromptDismissed(readSponsorPromptDismissed())
    analytics.removeBgPageViewed()
  }, [analytics])

  useEffect(() => {
    if (!sponsorPromptOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSponsorPromptOpen(false)
        analytics.removeBgSponsorPromptClosed({
          reason: 'escape',
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [analytics, sponsorPromptOpen])

  useEffect(() => {
    let cancelled = false

    void listRemoveBgHistory()
      .then(items => {
        if (cancelled) return
        setHistoryItems(items)
        analytics.removeBgHistoryLoaded({
          has_history: items.length > 0,
          history_count: items.length,
        })
        if (runIdRef.current === 0 && items[0]) {
          showHistoryItem(items[0], 'initial_restore', items.length)
        }
      })
      .catch(err => {
        if (!cancelled) analytics.captureError(err)
      })

    return () => {
      cancelled = true
    }
  }, [analytics, showHistoryItem])

  const rememberHistoryItem = useCallback(async (file: File, blob: Blob, filename: string) => {
    const item: RemoveBgHistoryItem = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      filename,
      sourceName: file.name || filename,
      originalBlob: file,
      resultBlob: blob,
    }

    await putRemoveBgHistoryItem(item, { limit: HISTORY_LIMIT })
    setHistoryItems(prev =>
      [item, ...prev.filter(existing => existing.id !== item.id)].slice(0, HISTORY_LIMIT),
    )
    setSelectedHistoryId(item.id)
  }, [])

  const deleteHistoryItem = useCallback(
    (item: RemoveBgHistoryItem) => {
      void (async () => {
        const wasSelected = selectedHistoryId === item.id
        await deleteRemoveBgHistoryItem(item.id)
        const items = await listRemoveBgHistory()
        setHistoryItems(items)
        analytics.removeBgHistoryDeleted({
          history_count_after: items.length,
          was_selected: wasSelected,
        })
        if (!wasSelected) return
        if (items[0]) {
          showHistoryItem(items[0], 'initial_restore', items.length)
          return
        }
        runIdRef.current += 1
        setSourceFile(null)
        setResultBlob(null)
        setResultFilename('image-no-bg.png')
        setStatus('empty')
        setCompareHeld(false)
        setError(null)
        setSelectedHistoryId(null)
      })().catch(err => {
        analytics.removeBgHistoryDeleteFailed()
        analytics.captureError(err)
      })
    },
    [analytics, selectedHistoryId, showHistoryItem],
  )

  const processFile = useCallback(
    (file: File, source: RemoveBgInputSource) => {
      const runId = runIdRef.current + 1
      runIdRef.current = runId
      setSourceFile(file)
      setResultBlob(null)
      setResultFilename(outputFilenameFor(file))
      setStatus('processing')
      setCompareHeld(false)
      setError(null)
      setSelectedHistoryId(null)
      const startedAt = performance.now()
      analytics.removeBgStarted({
        ...fileAnalyticsFor(file),
        source,
      })

      void (async () => {
        try {
          const output = await removeBackgroundFromFile(file)
          if (runIdRef.current !== runId) return
          setResultBlob(output.blob)
          const filename = output.filename || outputFilenameFor(file)
          setResultFilename(filename)
          setStatus('done')
          void rememberHistoryItem(file, output.blob, filename).catch(err => {
            analytics.captureError(err)
          })
          analytics.removeBgCompleted({
            ...fileAnalyticsFor(file),
            duration_ms: Math.round(performance.now() - startedAt),
            output_size: output.blob.size,
            output_type: output.blob.type || 'image/png',
            source,
          })
        } catch (err) {
          if (runIdRef.current !== runId) return
          const message =
            err instanceof Error && err.message.trim()
              ? err.message
              : 'Could not remove the background.'
          setStatus('error')
          setError(message)
          analytics.removeBgFailed({
            ...fileAnalyticsFor(file),
            duration_ms: Math.round(performance.now() - startedAt),
            error_message: message,
            source,
          })
          analytics.captureError(err)
        }
      })()
    },
    [analytics, rememberHistoryItem],
  )

  const chooseFile = useCallback(
    (file: File | null, source: RemoveBgInputSource) => {
      if (!file) return
      if (!isImageFile(file)) {
        setError('Choose an image file.')
        analytics.removeBgInvalidFileSelected({
          ...fileAnalyticsFor(file),
          source,
        })
        return
      }
      if (file.size > MAX_REMOVE_BG_FILE_SIZE_BYTES) {
        setError(`Choose an image ${MAX_REMOVE_BG_FILE_SIZE_LABEL} or smaller.`)
        analytics.removeBgFileTooLarge({
          ...fileAnalyticsFor(file),
          limit_bytes: MAX_REMOVE_BG_FILE_SIZE_BYTES,
          limit_label: MAX_REMOVE_BG_FILE_SIZE_LABEL,
          source,
        })
        return
      }
      analytics.removeBgFileSelected({
        ...fileAnalyticsFor(file),
        source,
      })
      processFile(file, source)
    },
    [analytics, processFile],
  )

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter(isImageFile)
      const imageFile = files[0]
      if (!imageFile) return
      event.preventDefault()
      chooseFile(imageFile, 'paste')
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [chooseFile])

  const downloadResult = useCallback(() => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = resultFilename
    a.click()
    const promptSuppressed = sponsorPromptDismissed || readSponsorPromptDismissed()
    analytics.removeBgDownloaded({
      extension: 'png',
      output_size: resultBlob?.size ?? null,
      prompt_suppressed: promptSuppressed,
    })
    if (!promptSuppressed) {
      setSponsorPromptOpen(true)
      analytics.removeBgSponsorPromptShown({
        trigger: 'download',
      })
    }
  }, [analytics, resultBlob?.size, resultFilename, resultUrl, sponsorPromptDismissed])

  const closeSponsorPrompt = useCallback(
    (reason: SponsorPromptCloseReason = 'remind_later') => {
      setSponsorPromptOpen(false)
      analytics.removeBgSponsorPromptClosed({
        reason,
      })
    },
    [analytics],
  )

  const dismissSponsorPromptForever = useCallback(() => {
    writeSponsorPromptDismissed()
    setSponsorPromptDismissed(true)
    setSponsorPromptOpen(false)
    analytics.removeBgSponsorPromptDismissedForever()
  }, [analytics])

  const openSponsorPage = useCallback(() => {
    setSponsorPromptOpen(false)
    analytics.removeBgSponsorPromptSponsorClicked()
  }, [analytics])

  const trackHeaderSponsorClick = useCallback(() => {
    analytics.removeBgSponsorHeaderClicked()
  }, [analytics])

  const trackCompareStart = useCallback(() => {
    if (compareHeld) return
    setCompareHeld(true)
    analytics.removeBgCompareStarted()
  }, [compareHeld, analytics])

  const openUploadPicker = useCallback(
    (surface: RemoveBgUploadSurface) => {
      analytics.removeBgUploadPickerOpened({ surface })
      inputRef.current?.click()
    },
    [analytics],
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      chooseFile(e.target.files?.[0] ?? null, 'file_picker')
      e.target.value = ''
    },
    [chooseFile],
  )

  const onDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!transferMayContainFiles(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current += 1
    setDragActive(true)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!transferMayContainFiles(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!transferMayContainFiles(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setDragActive(false)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      const mayContainFiles = transferMayContainFiles(e.dataTransfer)
      e.preventDefault()
      e.stopPropagation()
      dragDepthRef.current = 0
      setDragActive(false)
      if (!mayContainFiles) return
      chooseFile(imageFilesFromTransfer(e.dataTransfer)[0] ?? null, 'drop')
    },
    [chooseFile],
  )

  const hasStarted = status !== 'empty' || !!sourceFile

  return (
    <main
      className={cx('min-h-[100dvh] bg-white text-[#424242]', dragActive && 'bg-[#f7faff]')}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onInputChange}
      />

      {dragActive ? <DropOverlay /> : null}

      <RemoveBgHeader onSponsorClick={trackHeaderSponsorClick} />

      {hasStarted ? (
        <ResultView
          compareHeld={compareHeld}
          error={error}
          historyItems={historyItems}
          originalUrl={sourcePreviewUrl}
          processing={status === 'processing'}
          resultAlt={`${sourceFile?.name ?? 'Image'} without background`}
          resultReady={!!resultUrl}
          resultUrl={resultUrl}
          selectedHistoryId={selectedHistoryId}
          onCompareEnd={() => setCompareHeld(false)}
          onCompareStart={trackCompareStart}
          onDownload={downloadResult}
          onHistoryDelete={deleteHistoryItem}
          onHistorySelect={item => showHistoryItem(item, 'history_strip', historyItems.length)}
          onUpload={() => openUploadPicker('history_strip')}
        />
      ) : (
        <LandingView
          dragActive={dragActive}
          error={error}
          onUpload={() => openUploadPicker('landing')}
        />
      )}

      {sponsorPromptOpen ? (
        <SponsorPromptModal
          onDismissForever={dismissSponsorPromptForever}
          onClose={closeSponsorPrompt}
          onRemindLater={() => closeSponsorPrompt('remind_later')}
          onSponsor={openSponsorPage}
        />
      ) : null}
    </main>
  )
}

function RemoveBgUnavailablePage() {
  return (
    <main className="min-h-[100dvh] bg-[#f7f7f5] text-[#424242]">
      <RemoveBgHeader onSponsorClick={() => {}} />
      <section className="mx-auto grid min-h-[100dvh] w-full max-w-[72rem] place-items-center px-6 py-24 sm:px-10">
        <div className="w-full max-w-[42rem] text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-black/[0.08] bg-white text-[#db0061] shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
            <HugeiconsIcon icon={FavouriteIcon} size={30} strokeWidth={1.75} />
          </div>
          <h1 className="display-title mt-7 text-[clamp(3rem,12vw,5.8rem)] font-semibold leading-[0.94] text-[#363636]">
            Background removal is paused
          </h1>
          <p className="mx-auto mt-6 max-w-[35rem] text-base font-medium leading-7 text-[#59616b] sm:text-lg">
            {REMOVE_BG_UNAVAILABLE_MESSAGE}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/sponsor"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 text-base font-bold text-white transition hover:bg-neutral-800"
            >
              <HugeiconsIcon icon={Coffee02Icon} size={19} strokeWidth={1.9} />
              Sponsor Avnac
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/[0.1] bg-white px-6 text-base font-bold text-neutral-900 transition hover:bg-black/[0.04]"
            >
              Back home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function RemoveBgHeader({ onSponsorClick }: { onSponsorClick: () => void }) {
  return (
    <header className="pointer-events-none fixed left-0 right-0 top-0 z-40 px-4 py-4 sm:px-8">
      <div className="mx-auto flex w-full max-w-[94rem] items-center justify-between gap-3">
        <Link
          to="/"
          className="pointer-events-auto display-title rounded-full px-2 text-2xl font-semibold leading-none text-[#363636] transition hover:text-neutral-950 sm:text-3xl"
        >
          Avnac
        </Link>
        <Link
          to="/sponsor"
          className="pointer-events-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white/90 px-4 text-sm font-bold text-neutral-950 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-white sm:px-5"
          onClick={onSponsorClick}
        >
          <HugeiconsIcon icon={Coffee02Icon} size={18} strokeWidth={1.9} />
          <span className="hidden sm:inline">Sponsor / Support</span>
          <span className="sm:hidden">Support</span>
        </Link>
      </div>
    </header>
  )
}

function SponsorPromptModal({
  onClose,
  onDismissForever,
  onRemindLater,
  onSponsor,
}: {
  onClose: (reason: SponsorPromptCloseReason) => void
  onDismissForever: () => void
  onRemindLater: () => void
  onSponsor: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Remind me later"
        className="absolute inset-0 bg-[rgba(15,18,28,0.42)] backdrop-blur-[3px]"
        onClick={() => onClose('backdrop')}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-bg-sponsor-title"
        className="relative z-[1] w-full max-w-[34rem] overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white shadow-[0_32px_90px_rgba(15,23,42,0.24)]"
      >
        <div className="bg-[linear-gradient(135deg,#fff6dd,#ffe8f1_48%,#eef8ff)] px-6 pb-6 pt-7 sm:px-8 sm:pb-7">
          <div className="grid size-14 place-items-center rounded-2xl border border-white/70 bg-white/75 text-[#db0061] shadow-[0_10px_24px_rgba(219,0,97,0.12)]">
            <HugeiconsIcon icon={FavouriteIcon} size={28} strokeWidth={1.75} />
          </div>
          <h2
            id="remove-bg-sponsor-title"
            className="display-title mt-5 text-[clamp(2.4rem,9vw,3.6rem)] font-semibold leading-[0.94] text-[#323232]"
          >
            Keep Avnac free
          </h2>
          <p className="mt-4 max-w-[28rem] text-base font-medium leading-7 text-[#555f6b] sm:text-lg">
            Your download is ready. If Avnac saved you time, a small sponsorship helps keep fast,
            free tools available for everyone.
          </p>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:px-8 sm:py-6">
          <Link
            to="/sponsor"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-neutral-950 px-5 text-base font-bold text-white transition hover:bg-neutral-800"
            onClick={onSponsor}
          >
            Sponsor
          </Link>
          <button
            type="button"
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border border-black/[0.1] bg-white px-5 text-base font-bold text-neutral-900 transition hover:bg-black/[0.04]"
            onClick={onRemindLater}
          >
            Remind me later
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-transparent bg-transparent px-5 text-sm font-semibold text-[#65707c] transition hover:bg-black/[0.04] hover:text-neutral-950"
            onClick={onDismissForever}
          >
            Don&apos;t ask me again
          </button>
        </div>
      </section>
    </div>
  )
}

function DropOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-white/75 px-5 backdrop-blur-sm"
    >
      <div className="relative grid w-[min(100%,34rem)] place-items-center rounded-[2rem] border border-[var(--accent)] bg-white/95 px-6 py-9 text-center sm:px-10 sm:py-12">
        <div className="absolute inset-3 rounded-[1.55rem] border border-dashed border-[var(--accent)]/70" />
        <div className="relative grid size-16 place-items-center rounded-full bg-[var(--accent)] text-neutral-950">
          <HugeiconsIcon icon={CloudUploadIcon} size={30} strokeWidth={1.85} />
        </div>
        <div className="relative mt-5 text-[clamp(2rem,7vw,3.25rem)] font-extrabold leading-none text-[#363636]">
          Drop image
        </div>
        <div className="relative mt-3 rounded-full bg-[var(--accent)]/20 px-4 py-2 text-sm font-bold text-neutral-900 sm:text-base">
          Release to upload
        </div>
      </div>
    </div>
  )
}

function LandingView({
  dragActive,
  error,
  onUpload,
}: {
  dragActive: boolean
  error: string | null
  onUpload: () => void
}) {
  return (
    <section className="mx-auto grid min-h-[100dvh] w-full max-w-[92rem] items-center gap-8 px-6 pb-8 pt-24 sm:pb-10 sm:pt-28 lg:grid-cols-[1fr_0.95fr] lg:gap-10 lg:px-10 lg:pb-12">
      <div className="mx-auto w-full max-w-3xl text-center lg:mx-0 lg:text-left">
        <h1 className="display-title m-0 max-w-[52rem] text-[clamp(3.5rem,14vw,5rem)] font-semibold leading-[0.96] tracking-normal text-[#363636] sm:text-[clamp(4.75rem,9vw,6.4rem)] lg:text-[clamp(4.5rem,6.2vw,5.8rem)]">
          Remove Image
          <br />
          Background
        </h1>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[clamp(1.35rem,5.8vw,2rem)] font-extrabold leading-tight text-[#454545] sm:mt-8 sm:text-[clamp(1.6rem,3vw,2.35rem)] lg:justify-start">
          100% Free
          <span className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-neutral-950">
            Full Quality
          </span>
        </p>
      </div>

      <div className="mx-auto w-full max-w-[38rem]">
        <div
          className={cx(
            'grid min-h-[18rem] place-items-center rounded-[2rem] border border-black/[0.1] bg-white px-6 py-8 text-center transition-[border-color,transform] sm:min-h-[25rem] sm:rounded-[2.5rem] sm:px-8 sm:py-10',
            dragActive && 'translate-y-[-2px] border-[var(--accent)]',
          )}
        >
          <div>
            <button
              type="button"
              className="inline-flex min-h-16 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--accent)] px-10 text-[clamp(1.3rem,6vw,1.75rem)] font-bold text-neutral-950 transition hover:bg-[#e60061] sm:min-h-20 sm:px-14 sm:text-[clamp(1.55rem,3vw,2.25rem)]"
              onClick={onUpload}
            >
              Upload Image
            </button>
            <div className="mt-8 text-[clamp(1.25rem,5vw,1.55rem)] font-extrabold text-[#59616b] sm:mt-12 sm:text-[clamp(1.35rem,2.4vw,1.95rem)]">
              or drop a file
            </div>
            <div className="mt-3 text-sm font-bold text-[#7b8490]">
              Max {MAX_REMOVE_BG_FILE_SIZE_LABEL}
            </div>
          </div>
        </div>
        {error ? (
          <div className="mx-auto mt-5 max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ResultView({
  compareHeld,
  error,
  historyItems,
  originalUrl,
  processing,
  resultAlt,
  resultReady,
  resultUrl,
  selectedHistoryId,
  onCompareEnd,
  onCompareStart,
  onDownload,
  onHistoryDelete,
  onHistorySelect,
  onUpload,
}: {
  compareHeld: boolean
  error: string | null
  historyItems: RemoveBgHistoryItem[]
  originalUrl: string | null
  processing: boolean
  resultAlt: string
  resultReady: boolean
  resultUrl: string | null
  selectedHistoryId: string | null
  onCompareEnd: () => void
  onCompareStart: () => void
  onDownload: () => void
  onHistoryDelete: (item: RemoveBgHistoryItem) => void
  onHistorySelect: (item: RemoveBgHistoryItem) => void
  onUpload: () => void
}) {
  const showOriginal = processing || !resultUrl || compareHeld

  return (
    <section className="min-h-[100dvh] bg-[#f4f5f6] px-4 pb-5 pt-20 sm:px-8 sm:pt-24">
      <div className="mx-auto flex min-h-[calc(100dvh-6.25rem)] max-w-[94rem] flex-col justify-between gap-5 sm:min-h-[calc(100dvh-7.25rem)]">
        <div className="flex min-h-15 justify-center">
          {originalUrl && !processing ? (
            <div className="flex w-fit max-w-full items-center gap-2 rounded-full border border-black/[0.08] bg-white p-2">
              <button
                type="button"
                className={cx(
                  'inline-flex min-h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 text-base font-bold transition',
                  compareHeld
                    ? 'bg-[var(--accent)] text-neutral-950'
                    : 'bg-transparent text-[#5e6670] hover:bg-black/[0.04]',
                )}
                disabled={!originalUrl || !resultUrl}
                aria-label="Compare original"
                onBlur={onCompareEnd}
                onKeyDown={e => {
                  if (e.key === ' ' || e.key === 'Enter') onCompareStart()
                }}
                onKeyUp={onCompareEnd}
                onPointerCancel={onCompareEnd}
                onPointerDown={onCompareStart}
                onPointerLeave={onCompareEnd}
                onPointerUp={onCompareEnd}
              >
                <HugeiconsIcon icon={FlipLeftIcon} size={22} strokeWidth={1.85} />
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-[var(--accent)] px-5 text-base font-bold text-neutral-950 transition hover:bg-[#e60061] disabled:cursor-not-allowed disabled:bg-[#d7d7d7] disabled:text-neutral-500"
                disabled={!resultReady}
                onClick={onDownload}
              >
                <HugeiconsIcon icon={Download01Icon} size={21} strokeWidth={1.85} />
                Download
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {originalUrl ? (
            <div
              className="relative grid max-h-[calc(100dvh-14.5rem)] max-w-[min(100%,44rem)] place-items-center overflow-hidden rounded-2xl border border-black/[0.14]"
              style={checkerboardStyle}
            >
              <img
                src={resultUrl ?? originalUrl}
                alt={resultUrl ? resultAlt : 'Original image'}
                className="block max-h-[calc(100dvh-14.5rem)] max-w-full object-contain"
                draggable={false}
              />
              <img
                src={originalUrl}
                alt="Original image"
                className={cx(
                  'avnac-remove-bg-original-layer absolute inset-0 h-full w-full object-contain',
                  showOriginal && 'is-visible',
                )}
                draggable={false}
              />
              {processing ? (
                <div className="avnac-remove-bg-overlay pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="avnac-remove-bg-overlay__wash" />
                  <div className="avnac-remove-bg-overlay__beam" />
                  <div className="avnac-remove-bg-overlay__edge" />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-[#606975]">
              <HugeiconsIcon icon={Image01Icon} size={38} strokeWidth={1.75} />
              <span className="text-base font-semibold">Preparing image</span>
            </div>
          )}

          {error ? (
            <div className="absolute bottom-4 left-1/2 w-[min(92%,32rem)] -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <HistoryStrip
          items={historyItems}
          selectedId={selectedHistoryId}
          onDelete={onHistoryDelete}
          onSelect={onHistorySelect}
          onUpload={onUpload}
        />
      </div>
    </section>
  )
}

function HistoryStrip({
  items,
  selectedId,
  onDelete,
  onSelect,
  onUpload,
}: {
  items: RemoveBgHistoryItem[]
  selectedId: string | null
  onDelete: (item: RemoveBgHistoryItem) => void
  onSelect: (item: RemoveBgHistoryItem) => void
  onUpload: () => void
}) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    const urls: Record<string, string> = {}
    for (const item of items) {
      urls[item.id] = URL.createObjectURL(item.resultBlob)
    }
    setPreviewUrls(urls)
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url)
    }
  }, [items])

  useEffect(() => {
    if (selectedId !== openMenuId) setOpenMenuId(null)
  }, [openMenuId, selectedId])

  return (
    <nav
      className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-2 px-1 pb-1"
      aria-label="Processed images"
    >
      <button
        type="button"
        className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-lg border border-black/[0.08] bg-white/75 text-[#424242] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/15 sm:size-14"
        aria-label="Upload image"
        onClick={onUpload}
      >
        <HugeiconsIcon icon={Add01Icon} size={22} strokeWidth={1.65} />
      </button>

      {items.map(item => {
        const selected = item.id === selectedId
        return (
          <div key={item.id} className="relative shrink-0">
            <button
              type="button"
              title={item.filename}
              className={cx(
                'relative grid size-12 cursor-pointer place-items-center overflow-hidden rounded-lg border bg-white p-0 transition sm:size-14',
                selected
                  ? 'border-[var(--accent)] outline outline-3 outline-[var(--accent)]/35'
                  : 'border-black/[0.14] hover:border-[var(--accent)]',
              )}
              style={checkerboardStyle}
              onClick={() => {
                setOpenMenuId(null)
                onSelect(item)
              }}
            >
              {previewUrls[item.id] ? (
                <img
                  src={previewUrls[item.id]}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              ) : null}
            </button>
            {selected ? (
              <>
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 grid size-5 cursor-pointer place-items-center rounded-full border border-white bg-[#424242] text-white transition hover:bg-neutral-700"
                  aria-label="Image options"
                  aria-expanded={openMenuId === item.id}
                  onClick={e => {
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === item.id ? null : item.id)
                  }}
                >
                  <HugeiconsIcon icon={ArrowUp01Icon} size={12} strokeWidth={2} />
                </button>
                {openMenuId === item.id ? (
                  <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-30 min-w-32 rounded-xl border border-black/[0.08] bg-white p-1">
                    <button
                      type="button"
                      className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      onClick={() => {
                        setOpenMenuId(null)
                        onDelete(item)
                      }}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.75} />
                      Delete
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
