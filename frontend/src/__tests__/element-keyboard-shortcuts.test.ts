// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  sceneCreationShortcutForKey,
  useEditorKeyboardShortcuts,
} from '../components/scene-editor/use-editor-keyboard-shortcuts'

describe('sceneCreationShortcutForKey', () => {
  it('maps shortcut keys to element creation actions', () => {
    expect(sceneCreationShortcutForKey('t')).toEqual({ type: 'text' })
    expect(sceneCreationShortcutForKey('R')).toEqual({ type: 'shape', kind: 'rect' })
    expect(sceneCreationShortcutForKey('o')).toEqual({ type: 'shape', kind: 'ellipse' })
    expect(sceneCreationShortcutForKey('p')).toEqual({ type: 'shape', kind: 'polygon' })
    expect(sceneCreationShortcutForKey('s')).toEqual({ type: 'shape', kind: 'star' })
    expect(sceneCreationShortcutForKey('l')).toEqual({ type: 'shape', kind: 'line' })
    expect(sceneCreationShortcutForKey('a')).toEqual({ type: 'shape', kind: 'arrow' })
  })

  it('ignores keys without an element shortcut', () => {
    expect(sceneCreationShortcutForKey('z')).toBeNull()
    expect(sceneCreationShortcutForKey('?')).toBeNull()
  })
})

describe('useEditorKeyboardShortcuts element shortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('adds elements from unmodified keys inside the editor scope', () => {
    const scope = document.createElement('div')
    document.body.appendChild(scope)
    const addText = vi.fn()
    const addShapeFromKind = vi.fn()

    const { unmount } = renderHook(() =>
      useEditorKeyboardShortcuts({
        addShapeFromKind,
        addText,
        applyingHistoryRef: { current: false },
        commitTextDraft: vi.fn(),
        copyElementToClipboard: vi.fn(),
        deleteSelection: vi.fn(),
        duplicateElement: vi.fn(),
        groupSelection: vi.fn(),
        historyIndexRef: { current: 0 },
        historyRef: { current: [] },
        nudgeSelection: vi.fn(),
        onZoomFitRequest: vi.fn(),
        onZoomInRequest: vi.fn(),
        onZoomOutRequest: vi.fn(),
        pasteFromClipboard: vi.fn(),
        reorderSelectionLayers: vi.fn(),
        setDoc: vi.fn(),
        setShortcutsOpen: vi.fn(),
        shortcutScopeRef: { current: scope },
        ungroupSelection: vi.fn(),
      }),
    )

    scope.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    scope.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 't' }))
    scope.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'r' }))

    expect(addText).toHaveBeenCalledTimes(1)
    expect(addShapeFromKind).toHaveBeenCalledWith('rect')
    unmount()
  })

  it('does not add elements when a modifier key is held', () => {
    const scope = document.createElement('div')
    document.body.appendChild(scope)
    const addText = vi.fn()
    const addShapeFromKind = vi.fn()

    const { unmount } = renderHook(() =>
      useEditorKeyboardShortcuts({
        addShapeFromKind,
        addText,
        applyingHistoryRef: { current: false },
        commitTextDraft: vi.fn(),
        copyElementToClipboard: vi.fn(),
        deleteSelection: vi.fn(),
        duplicateElement: vi.fn(),
        groupSelection: vi.fn(),
        historyIndexRef: { current: 0 },
        historyRef: { current: [] },
        nudgeSelection: vi.fn(),
        onZoomFitRequest: vi.fn(),
        onZoomInRequest: vi.fn(),
        onZoomOutRequest: vi.fn(),
        pasteFromClipboard: vi.fn(),
        reorderSelectionLayers: vi.fn(),
        setDoc: vi.fn(),
        setShortcutsOpen: vi.fn(),
        shortcutScopeRef: { current: scope },
        ungroupSelection: vi.fn(),
      }),
    )

    scope.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    scope.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, key: 't' }),
    )

    expect(addText).not.toHaveBeenCalled()
    expect(addShapeFromKind).not.toHaveBeenCalled()
    unmount()
  })
})
