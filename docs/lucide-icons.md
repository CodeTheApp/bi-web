# Shared Lucide icons

Application icons are imported from `@/shared/ui/icons/lucide`. The facade exports Lucide-compatible components and types, including existing `*Icon` aliases. Each component renders one SVG root, forwards SVG props and the SVG ref, and animates its own paths/groups. No wrapper or independent CSS wiggle is used.

## Sources and adaptation

The animation source is [Lucide Animated](https://lucide-animated.com/), maintained as [pqoqubbw/icons](https://github.com/pqoqubbw/icons). Source files are credited individually and covered by the included MIT license. Canonical shapes that require newer names come from the installed [lucide-react](https://github.com/lucide-icons/lucide) version under ISC, also included locally.

The current catalogue contains **98 components**, with **63 preserving official per-icon motion variants** and **35 adapting the official BoxIcon internal path-drawing animation to canonical Lucide geometry**. The latter are explicit adaptations, not upstream per-icon animated implementations. They are:

`AlertCircle`, `ArrowLeftToLine`, `ArrowRightToLine`, `BarChart3`, `BookOpen`, `ChartColumn`, `ChartNoAxesCombined`, `CircleAlert`, `CirclePlus`, `CloudOff`, `FilePlus`, `Folder`, `Image`, `Inbox`, `Keyboard`, `Lightbulb`, `Link2`, `Mail`, `Minus`, `Monitor`, `Package`, `Pin`, `PinOff`, `QrCode`, `Quote`, `Settings2`, `ShoppingBag`, `Smartphone`, `Star`, `Tag`, `TicketPercent`, `Trash2`, `Type`, `UserRound`, `Video`.

The official registry's div/imperative-ref boundary was adapted to SVG-only components so buttons, Radix primitives and existing Lucide consumers keep their expected layout and refs. Infinite repeats are disabled. The Keyboard icon uses finite path drawing rather than random ongoing key presses. Official name differences include House/Home, LogOut/Logout, Paperclip/AttachFile, Globe/Earth, Pencil/SquarePen, Undo2/Undo and Loader2/Loader.

## Interaction and accessibility

A component reacts to hover, focus, pointerdown and click on the nearest control: button, link, label, ARIA menu/tab item or an ancestor marked `data-icon-scope`. Selection changes also animate menu items used with roving keyboard focus. Icons play once per interaction, stop on exit, skip disabled controls, and respect `prefers-reduced-motion`. Mark a noninteractive card with `data-icon-scope` when its whole surface should trigger the icon. Do not add a button solely for animation.

The SVG ref can additionally expose `startAnimation()` and `stopAnimation()` after mount. Normal SVG refs and custom data/ARIA attributes remain supported. Labels belong on the interactive control; decorative icons are hidden from assistive technologies by default unless their own accessible name or role is supplied.

`semantic.ts` is the canonical destination catalogue. `widgets/admin-shell/model/navigation.ts` derives sidebar/submenu routes and Marking Menu entries from these same component references. Add destinations there rather than choosing a different icon in each menu.

## Verification

`tests/icon-playback.test.ts` covers reduced motion, disabled controls, finite repeated events, stale completions and safe cleanup after unmount. `tests/icon-svg-contract.test.ts` verifies SVG-only rendering, size/stroke/data/ARIA forwarding and consistent route icons. The lifecycle controller deliberately never calls Motion `set()` after disposal.
