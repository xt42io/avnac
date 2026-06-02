/**
 * The analytics event catalog.
 *
 * `Payloads` is the per-event payload namespace (see `event-payloads.ts`).
 * `AnalyticsEvents` maps each event name to its payload and is what the facade
 * and `emit` are typed against — the single source of truth for every product
 * event Avnac emits.
 */

export * as Payloads from "./event-payloads";

import type * as Payloads from "./event-payloads";

/** Event name -> payload. The backbone the facade and `emit` are typed against. */
export type AnalyticsEvents = {
  editor_opened: Payloads.EditorOpenedPayload;
  canvas_created: Payloads.CanvasCreatedPayload;
  file_opened: Payloads.FileOpenedPayload;
  file_duplicated: Payloads.FileDuplicatedPayload;
  file_downloaded: Payloads.FileDownloadedPayload;
  file_deleted: Payloads.FileDeletedPayload;
  files_bulk_downloaded: Payloads.FilesBulkDownloadedPayload;
  file_imported: Payloads.FileImportedPayload;
  document_renamed: Payloads.DocumentRenamedPayload;
  ai_prompt_submitted: Payloads.AiPromptSubmittedPayload;
  image_exported: Payloads.ImageExportedPayload;
  legacy_conversion_prompt_opened: Payloads.LegacyConversionPromptOpenedPayload;
  legacy_conversion_started: Payloads.LegacyConversionStartedPayload;
  legacy_conversion_completed: Payloads.LegacyConversionCompletedPayload;
  legacy_conversion_failed: Payloads.LegacyConversionFailedPayload;
  legacy_conversion_cancelled: Payloads.LegacyConversionCancelledPayload;
  remove_bg_page_viewed: Payloads.RemoveBgPageViewedPayload;
  remove_bg_history_loaded: Payloads.RemoveBgHistoryLoadedPayload;
  remove_bg_history_selected: Payloads.RemoveBgHistorySelectedPayload;
  remove_bg_history_deleted: Payloads.RemoveBgHistoryDeletedPayload;
  remove_bg_history_delete_failed: Payloads.RemoveBgHistoryDeleteFailedPayload;
  remove_bg_started: Payloads.RemoveBgStartedPayload;
  remove_bg_completed: Payloads.RemoveBgCompletedPayload;
  remove_bg_failed: Payloads.RemoveBgFailedPayload;
  remove_bg_file_selected: Payloads.RemoveBgFileSelectedPayload;
  remove_bg_invalid_file_selected: Payloads.RemoveBgInvalidFileSelectedPayload;
  remove_bg_file_too_large: Payloads.RemoveBgFileTooLargePayload;
  remove_bg_downloaded: Payloads.RemoveBgDownloadedPayload;
  remove_bg_compare_started: Payloads.RemoveBgCompareStartedPayload;
  remove_bg_upload_picker_opened: Payloads.RemoveBgUploadPickerOpenedPayload;
  remove_bg_sponsor_prompt_shown: Payloads.RemoveBgSponsorPromptShownPayload;
  remove_bg_sponsor_prompt_closed: Payloads.RemoveBgSponsorPromptClosedPayload;
  remove_bg_sponsor_prompt_dismissed_forever: Payloads.RemoveBgSponsorPromptDismissedForeverPayload;
  remove_bg_sponsor_prompt_sponsor_clicked: Payloads.RemoveBgSponsorPromptSponsorClickedPayload;
  remove_bg_sponsor_header_clicked: Payloads.RemoveBgSponsorHeaderClickedPayload;
};

export type AnalyticsEventName = keyof AnalyticsEvents;

/**
 * Method-name -> event-name map used by the facade. `satisfies` ties every
 * value to a real key of `AnalyticsEvents`, so a typo or stale name fails to
 * compile rather than silently sending an unknown event.
 */
export const ANALYTICS_EVENTS = {
  // Navigation / creation
  editorOpened: "editor_opened",
  canvasCreated: "canvas_created",

  // Files
  fileOpened: "file_opened",
  fileDuplicated: "file_duplicated",
  fileDownloaded: "file_downloaded",
  fileDeleted: "file_deleted",
  filesBulkDownloaded: "files_bulk_downloaded",
  fileImported: "file_imported",
  documentRenamed: "document_renamed",

  // Editor
  aiPromptSubmitted: "ai_prompt_submitted",
  imageExported: "image_exported",

  // Legacy file conversion
  legacyConversionPromptOpened: "legacy_conversion_prompt_opened",
  legacyConversionStarted: "legacy_conversion_started",
  legacyConversionCompleted: "legacy_conversion_completed",
  legacyConversionFailed: "legacy_conversion_failed",
  legacyConversionCancelled: "legacy_conversion_cancelled",

  // Background removal (paused feature route)
  removeBgPageViewed: "remove_bg_page_viewed",
  removeBgHistoryLoaded: "remove_bg_history_loaded",
  removeBgHistorySelected: "remove_bg_history_selected",
  removeBgHistoryDeleted: "remove_bg_history_deleted",
  removeBgHistoryDeleteFailed: "remove_bg_history_delete_failed",
  removeBgStarted: "remove_bg_started",
  removeBgCompleted: "remove_bg_completed",
  removeBgFailed: "remove_bg_failed",
  removeBgFileSelected: "remove_bg_file_selected",
  removeBgInvalidFileSelected: "remove_bg_invalid_file_selected",
  removeBgFileTooLarge: "remove_bg_file_too_large",
  removeBgDownloaded: "remove_bg_downloaded",
  removeBgCompareStarted: "remove_bg_compare_started",
  removeBgUploadPickerOpened: "remove_bg_upload_picker_opened",
  removeBgSponsorPromptShown: "remove_bg_sponsor_prompt_shown",
  removeBgSponsorPromptClosed: "remove_bg_sponsor_prompt_closed",
  removeBgSponsorPromptDismissedForever:
    "remove_bg_sponsor_prompt_dismissed_forever",
  removeBgSponsorPromptSponsorClicked:
    "remove_bg_sponsor_prompt_sponsor_clicked",
  removeBgSponsorHeaderClicked: "remove_bg_sponsor_header_clicked",
} as const satisfies Record<string, AnalyticsEventName>;
