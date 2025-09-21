import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { APP_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcutGroups = [
  {
    title: 'Navigation',
    shortcuts: [
      { ...APP_SHORTCUTS.COMMAND_PALETTE, keys: '⌘K' },
      { ...APP_SHORTCUTS.SEARCH, keys: '/' },
      { ...APP_SHORTCUTS.TOGGLE_SIDEBAR, keys: '⌘B' },
      { ...APP_SHORTCUTS.ESCAPE, keys: 'Esc' }
    ]
  },
  {
    title: 'Actions',
    shortcuts: [
      { ...APP_SHORTCUTS.NEW_TASK, keys: '⌘N' },
      { ...APP_SHORTCUTS.NEW_NOTE, keys: '⌘⇧N' },
      { ...APP_SHORTCUTS.SAVE, keys: '⌘S' },
      { ...APP_SHORTCUTS.DELETE, keys: '⌘D' },
      { ...APP_SHORTCUTS.QUICK_ACTION, keys: '⌘Enter' }
    ]
  },
  {
    title: 'Editing',
    shortcuts: [
      { ...APP_SHORTCUTS.UNDO, keys: '⌘Z' },
      { ...APP_SHORTCUTS.REDO, keys: '⌘⇧Z' },
      { ...APP_SHORTCUTS.SELECT_ALL, keys: '⌘A' }
    ]
  },
  {
    title: 'Movement',
    shortcuts: [
      { ...APP_SHORTCUTS.NAVIGATE_UP, keys: '↑' },
      { ...APP_SHORTCUTS.NAVIGATE_DOWN, keys: '↓' },
      { ...APP_SHORTCUTS.TAB_NEXT, keys: 'Tab' },
      { ...APP_SHORTCUTS.TAB_PREV, keys: '⇧Tab' },
      { ...APP_SHORTCUTS.PAGE_UP, keys: 'PgUp' },
      { ...APP_SHORTCUTS.PAGE_DOWN, keys: 'PgDn' }
    ]
  }
]

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[hsl(225_18%_9%)] border border-[hsl(217_30%_15%)] p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-semibold leading-6 text-[hsl(210_40%_98%)] mb-6"
                >
                  Keyboard Shortcuts
                </Dialog.Title>

                <div className="grid gap-6 md:grid-cols-2">
                  {shortcutGroups.map((group) => (
                    <div key={group.title}>
                      <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-[hsl(215_20%_65%)]">
                        {group.title}
                      </h4>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut) => (
                          <div
                            key={shortcut.keys}
                            className="flex items-center justify-between rounded-lg bg-[hsl(225_20%_6%)]/50 px-3 py-2"
                          >
                            <span className="text-sm text-[hsl(210_40%_98%)]">
                              {shortcut.description}
                            </span>
                            <kbd className="ml-2 rounded bg-[hsl(217_30%_18%)] px-2 py-1 text-xs font-mono text-[hsl(210_40%_98%)]">
                              {shortcut.keys}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg bg-[hsl(190_90%_50%)] px-4 py-2 text-sm font-medium text-white hover:bg-[hsl(190_90%_45%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(190_90%_50%)] focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Got it
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}