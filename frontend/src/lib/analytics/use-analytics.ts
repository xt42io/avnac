import { usePostHog } from 'posthog-js/react'
import { useMemo } from 'react'
import { ANALYTICS_EVENTS, type AnalyticsEvents, type Payloads } from './events'

/** Events whose payload type is `undefined` are called with no argument. */
type EmptyEvents = {
  [E in keyof AnalyticsEvents]: AnalyticsEvents[E] extends undefined ? E : never
}[keyof AnalyticsEvents]

/**
 * Typed analytics facade.
 *
 * Every product event is a named method whose payload is a named type in the
 * `Payloads` namespace. Event names come from `ANALYTICS_EVENTS`, not inline
 * strings. All calls funnel through `emit`, which is the single place a
 * provider (PostHog today) is named — add or swap a provider there and every
 * call site comes along for free.
 */
export function useAnalytics() {
  const posthog = usePostHog()

  return useMemo(() => {
    function emit<E extends EmptyEvents>(event: E): void
    function emit<E extends keyof AnalyticsEvents>(event: E, props: AnalyticsEvents[E]): void
    function emit<E extends keyof AnalyticsEvents>(event: E, props?: AnalyticsEvents[E]): void {
      posthog.capture(event, props ?? undefined)
    }

    return {
      // Navigation / creation
      editorOpened: (p: Payloads.EditorOpenedPayload) => emit(ANALYTICS_EVENTS.editorOpened, p),
      canvasCreated: (p: Payloads.CanvasCreatedPayload) => emit(ANALYTICS_EVENTS.canvasCreated, p),

      // Files
      fileOpened: (p: Payloads.FileOpenedPayload) => emit(ANALYTICS_EVENTS.fileOpened, p),
      fileDuplicated: (p: Payloads.FileDuplicatedPayload) =>
        emit(ANALYTICS_EVENTS.fileDuplicated, p),
      fileDownloaded: (p: Payloads.FileDownloadedPayload) =>
        emit(ANALYTICS_EVENTS.fileDownloaded, p),
      fileDeleted: (p: Payloads.FileDeletedPayload) => emit(ANALYTICS_EVENTS.fileDeleted, p),
      filesBulkDownloaded: (p: Payloads.FilesBulkDownloadedPayload) =>
        emit(ANALYTICS_EVENTS.filesBulkDownloaded, p),
      fileImported: (p: Payloads.FileImportedPayload) => emit(ANALYTICS_EVENTS.fileImported, p),
      documentRenamed: (p: Payloads.DocumentRenamedPayload) =>
        emit(ANALYTICS_EVENTS.documentRenamed, p),

      // Editor
      aiPromptSubmitted: (p: Payloads.AiPromptSubmittedPayload) =>
        emit(ANALYTICS_EVENTS.aiPromptSubmitted, p),
      imageExported: (p: Payloads.ImageExportedPayload) => emit(ANALYTICS_EVENTS.imageExported, p),

      // Legacy file conversion
      legacyConversionPromptOpened: (p: Payloads.LegacyConversionPromptOpenedPayload) =>
        emit(ANALYTICS_EVENTS.legacyConversionPromptOpened, p),
      legacyConversionStarted: (p: Payloads.LegacyConversionStartedPayload) =>
        emit(ANALYTICS_EVENTS.legacyConversionStarted, p),
      legacyConversionCompleted: (p: Payloads.LegacyConversionCompletedPayload) =>
        emit(ANALYTICS_EVENTS.legacyConversionCompleted, p),
      legacyConversionFailed: (p: Payloads.LegacyConversionFailedPayload) =>
        emit(ANALYTICS_EVENTS.legacyConversionFailed, p),
      legacyConversionCancelled: (p: Payloads.LegacyConversionCancelledPayload) =>
        emit(ANALYTICS_EVENTS.legacyConversionCancelled, p),

      // Background removal (paused feature route)
      removeBgPageViewed: () => emit(ANALYTICS_EVENTS.removeBgPageViewed),
      removeBgHistoryLoaded: (p: Payloads.RemoveBgHistoryLoadedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgHistoryLoaded, p),
      removeBgHistorySelected: (p: Payloads.RemoveBgHistorySelectedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgHistorySelected, p),
      removeBgHistoryDeleted: (p: Payloads.RemoveBgHistoryDeletedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgHistoryDeleted, p),
      removeBgHistoryDeleteFailed: () => emit(ANALYTICS_EVENTS.removeBgHistoryDeleteFailed),
      removeBgStarted: (p: Payloads.RemoveBgStartedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgStarted, p),
      removeBgCompleted: (p: Payloads.RemoveBgCompletedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgCompleted, p),
      removeBgFailed: (p: Payloads.RemoveBgFailedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgFailed, p),
      removeBgFileSelected: (p: Payloads.RemoveBgFileSelectedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgFileSelected, p),
      removeBgInvalidFileSelected: (p: Payloads.RemoveBgInvalidFileSelectedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgInvalidFileSelected, p),
      removeBgFileTooLarge: (p: Payloads.RemoveBgFileTooLargePayload) =>
        emit(ANALYTICS_EVENTS.removeBgFileTooLarge, p),
      removeBgDownloaded: (p: Payloads.RemoveBgDownloadedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgDownloaded, p),
      removeBgCompareStarted: () => emit(ANALYTICS_EVENTS.removeBgCompareStarted),
      removeBgUploadPickerOpened: (p: Payloads.RemoveBgUploadPickerOpenedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgUploadPickerOpened, p),
      removeBgSponsorPromptShown: (p: Payloads.RemoveBgSponsorPromptShownPayload) =>
        emit(ANALYTICS_EVENTS.removeBgSponsorPromptShown, p),
      removeBgSponsorPromptClosed: (p: Payloads.RemoveBgSponsorPromptClosedPayload) =>
        emit(ANALYTICS_EVENTS.removeBgSponsorPromptClosed, p),
      removeBgSponsorPromptDismissedForever: () =>
        emit(ANALYTICS_EVENTS.removeBgSponsorPromptDismissedForever),
      removeBgSponsorPromptSponsorClicked: () =>
        emit(ANALYTICS_EVENTS.removeBgSponsorPromptSponsorClicked),
      removeBgSponsorHeaderClicked: () => emit(ANALYTICS_EVENTS.removeBgSponsorHeaderClicked),

      /** Report an unexpected error. Mirrors the prior captureException + console.error pattern. */
      captureError: (error: unknown, context?: string) => {
        posthog.captureException(error)
        if (context) console.error(context, error)
      },
    }
  }, [posthog])
}
