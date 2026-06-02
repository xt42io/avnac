/**
 * Payload type per analytics event. Re-exported from `events.ts` as the
 * `Payloads` namespace and mapped to event names there.
 */

type LegacyConversionSurface = "create_page" | "files_page";

/** Shared shape for the legacy-file conversion lifecycle events. */
interface LegacyConversionPayload {
  surface: LegacyConversionSurface;
  trigger_source: string;
  file_count: number;
  file_ids: string[];
  open_after_conversion: boolean;
}

/** Per-file properties attached to remove-background events. */
interface RemoveBgFilePayload {
  file_extension: string | null;
  file_size: number;
  file_type: string;
}

// Navigation / creation
export interface EditorOpenedPayload {
  source: string;
  destination: string;
  existing_file_count: number;
}
export interface CanvasCreatedPayload {
  width: number;
  height: number;
  creation_mode: "preset" | "custom";
  preset_label: string | null;
}

// Files
export interface FileOpenedPayload {
  file_id: string;
  method: string;
}
export interface FileDuplicatedPayload {
  file_id: string;
  new_file_id: string;
}
export interface FileDownloadedPayload {
  file_id: string;
  format: "json";
}
export interface FileDeletedPayload {
  file_count: number;
  file_ids: string[];
}
export interface FilesBulkDownloadedPayload {
  file_count: number;
}
export interface FileImportedPayload {
  file_id: string;
  file_name: string;
  source_name: string;
  source_type: "json";
  imported_version: number;
}
export interface DocumentRenamedPayload {
  file_id: string;
  new_name: string;
}

// Editor
export interface AiPromptSubmittedPayload {
  prompt_length: number;
  image_count: number;
}
export interface ImageExportedPayload {
  format: string;
  scale: number;
  transparent: boolean;
  flattenPdf: boolean | undefined;
  pageCount: number;
}

// Legacy file conversion
export interface LegacyConversionPromptOpenedPayload extends LegacyConversionPayload {}
export interface LegacyConversionStartedPayload extends LegacyConversionPayload {}
export interface LegacyConversionCompletedPayload extends LegacyConversionPayload {
  opened_file_id: string | null;
}
export interface LegacyConversionFailedPayload extends LegacyConversionPayload {}
export interface LegacyConversionCancelledPayload extends LegacyConversionPayload {}

// Background removal (paused feature route)
export type RemoveBgPageViewedPayload = undefined;
export interface RemoveBgHistoryLoadedPayload {
  has_history: boolean;
  history_count: number;
}
export interface RemoveBgHistorySelectedPayload {
  history_count: number | null;
  item_age_ms: number;
  output_size: number;
  source: string;
}
export interface RemoveBgHistoryDeletedPayload {
  history_count_after: number;
  was_selected: boolean;
}
export type RemoveBgHistoryDeleteFailedPayload = undefined;
export interface RemoveBgStartedPayload extends RemoveBgFilePayload {
  source: string;
}
export interface RemoveBgCompletedPayload extends RemoveBgFilePayload {
  duration_ms: number;
  output_size: number;
  output_type: string;
  source: string;
}
export interface RemoveBgFailedPayload extends RemoveBgFilePayload {
  duration_ms: number;
  error_message: string;
  source: string;
}
export interface RemoveBgFileSelectedPayload extends RemoveBgFilePayload {
  source: string;
}
export interface RemoveBgInvalidFileSelectedPayload extends RemoveBgFilePayload {
  source: string;
}
export interface RemoveBgFileTooLargePayload extends RemoveBgFilePayload {
  limit_bytes: number;
  limit_label: string;
  source: string;
}
export interface RemoveBgDownloadedPayload {
  extension: "png";
  output_size: number | null;
  prompt_suppressed: boolean;
}
export type RemoveBgCompareStartedPayload = undefined;
export interface RemoveBgUploadPickerOpenedPayload {
  surface: string;
}
export interface RemoveBgSponsorPromptShownPayload {
  trigger: string;
}
export interface RemoveBgSponsorPromptClosedPayload {
  reason: string;
}
export type RemoveBgSponsorPromptDismissedForeverPayload = undefined;
export type RemoveBgSponsorPromptSponsorClickedPayload = undefined;
export type RemoveBgSponsorHeaderClickedPayload = undefined;
