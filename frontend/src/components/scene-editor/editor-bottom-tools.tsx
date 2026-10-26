import {
  ArrowDown01Icon,
  HelpCircleIcon,
  Image01Icon,
  TextFontIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import CanvasZoomSlider from '../canvas-zoom-slider'
import ShapesPopover, {
  iconForShapesQuickAdd,
  type PopoverShapeKind,
  type ShapesQuickAddKind,
} from '../shapes-popover'
import { Button, IconButton, Toolbar, ToolbarGroup } from '../ui'

export function EditorBottomTools({
  addShapeFromKind,
  addText,
  imageInputRef,
  maxZoom,
  minZoom,
  onZoomFitRequest,
  onZoomSliderChange,
  ready,
  setShapesPopoverOpen,
  setShapesQuickAddKind,
  setShortcutsOpen,
  shapeToolSplitRef,
  shapesPopoverOpen,
  shapesQuickAddKind,
  zoomPercent,
}: {
  addShapeFromKind: (kind: PopoverShapeKind) => void
  addText: () => void
  imageInputRef: RefObject<HTMLInputElement | null>
  maxZoom: number
  minZoom: number
  onZoomFitRequest: () => void
  onZoomSliderChange: (pct: number) => void
  ready: boolean
  setShapesPopoverOpen: Dispatch<SetStateAction<boolean>>
  setShapesQuickAddKind: Dispatch<SetStateAction<ShapesQuickAddKind>>
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>
  shapeToolSplitRef: RefObject<HTMLDivElement | null>
  shapesPopoverOpen: boolean
  shapesQuickAddKind: ShapesQuickAddKind
  zoomPercent: number | null
}) {
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] right-3 z-30 sm:right-4">
        {ready && zoomPercent !== null ? (
          <CanvasZoomSlider
            value={zoomPercent}
            min={minZoom}
            max={maxZoom}
            onChange={onZoomSliderChange}
            onFitRequest={onZoomFitRequest}
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-2 pt-24">
        <Toolbar aria-label="Editor tools">
          <ToolbarGroup ref={shapeToolSplitRef}>
            <Button
              disabled={!ready}
              variant="ghost"
              size="xs"
              className="min-w-[2.5rem] rounded-full px-2"
              onClick={() =>
                addShapeFromKind(shapesQuickAddKind === 'generic' ? 'rect' : shapesQuickAddKind)
              }
              aria-label="Add shape"
              title="Add shape (R / O / P / S / L / A)"
              iconBefore={
                <HugeiconsIcon
                  icon={iconForShapesQuickAdd(shapesQuickAddKind)}
                  size={20}
                  strokeWidth={1.75}
                />
              }
            />
            <IconButton
              icon={ArrowDown01Icon}
              label="More shapes"
              disabled={!ready}
              size="sm"
              className="rounded-full"
              onClick={() => setShapesPopoverOpen(open => !open)}
              aria-expanded={shapesPopoverOpen}
              aria-haspopup="menu"
            />
            <ShapesPopover
              open={shapesPopoverOpen}
              disabled={!ready}
              anchorRef={shapeToolSplitRef}
              onClose={() => setShapesPopoverOpen(false)}
              onPick={kind => {
                setShapesQuickAddKind(kind)
                addShapeFromKind(kind)
                setShapesPopoverOpen(false)
              }}
            />
          </ToolbarGroup>
          <IconButton
            icon={TextFontIcon}
            label="Add text"
            title="Add text (T)"
            disabled={!ready}
            size="md"
            className="rounded-lg"
            onClick={addText}
            strokeWidth={1.75}
          />
          <IconButton
            icon={Image01Icon}
            label="Add image"
            disabled={!ready}
            size="md"
            className="rounded-lg"
            onClick={() => imageInputRef.current?.click()}
            strokeWidth={1.75}
          />
          <IconButton
            icon={HelpCircleIcon}
            label="Keyboard shortcuts"
            disabled={!ready}
            size="md"
            className="rounded-lg"
            onClick={() => setShortcutsOpen(true)}
            strokeWidth={1.75}
            title="Shortcuts (?)"
          />
          {!ready ? (
            <span className="px-3 text-xs text-[var(--text-muted)]">Loading...</span>
          ) : null}
        </Toolbar>
      </div>
    </>
  )
}
