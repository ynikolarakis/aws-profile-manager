# Linear-Style Design System

## Core Principles
- Monochrome zinc palette with ONE bold accent (blue #3b82f6)
- Geist Sans for UI text, Geist Mono for code/data
- No gradients, no glass effects, just clean lines
- Dark mode first: #09090b background, #18181b cards
- Minimal chrome, generous whitespace
- Every interactive element has keyboard shortcut
- Animations: spring-based, <200ms

## Component Patterns
- Floating context menus (three dots icon) instead of inline action buttons
- Slide-over sheets from right for detail views
- Resizable panels with drag handles
- Toast notifications (bottom-right, auto-dismiss 3s)
- Command palette (Cmd+K) for quick actions
- Dialogs: centered, backdrop blur, scale-in animation

## Typography

### Font Stack
```css
--font-sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'GeistMono', 'SF Mono', 'Fira Code', monospace;
```

### Sizes and Weights
- Body: 13px Geist Sans, line-height 1.5, font-weight 400
- Terminal: 13.5px Geist Mono, line-height 1.75, font-weight 400
- Labels: 10px uppercase, letter-spacing .05em, font-weight 600
- Headings: Geist Sans, font-weight 700, letter-spacing -.03em
- Small text: 11px, font-weight 400
- Buttons: 13px, font-weight 500

## Colors

### Dark Theme (Default)
```css
/* Backgrounds — 5 levels, darkest to lightest */
--bg-0: #09090b;   /* App background */
--bg-1: #0f0f12;   /* Sidebar, panels */
--bg-2: #18181b;   /* Cards, elevated surfaces */
--bg-3: #1e1e22;   /* Hover states */
--bg-4: #27272a;   /* Active states, borders */

/* Text — 4 levels, brightest to dimmest */
--t1: #fafafa;     /* Primary text */
--t2: #a1a1aa;     /* Secondary text */
--t3: #71717a;     /* Tertiary/placeholder text */
--t4: #3f3f46;     /* Disabled text, dividers */

/* Borders */
--border: rgba(255, 255, 255, 0.06);
--border-hover: rgba(255, 255, 255, 0.12);

/* Accent */
--accent: #3b82f6;           /* Blue — primary actions */
--accent-dim: rgba(59, 130, 246, 0.1);  /* Blue background tint */
--accent-hover: #2563eb;     /* Blue hover */

/* Status Colors */
--green: #22c55e;    /* Success, SSO active, verified */
--amber: #f59e0b;    /* Warning, role type, info */
--red: #ef4444;      /* Error, danger actions, delete */
--violet: #8b5cf6;   /* Credentials type indicator */
--cyan: #06b6d4;     /* Terminal commands, links */
```

### Light Theme
```css
--bg-0: #ffffff;
--bg-1: #fafafa;
--bg-2: #f4f4f5;
--bg-3: #e4e4e7;
--bg-4: #d4d4d8;

--t1: #09090b;
--t2: #52525b;
--t3: #a1a1aa;
--t4: #d4d4d8;

--border: rgba(0, 0, 0, 0.06);
--border-hover: rgba(0, 0, 0, 0.12);
```

## Layout

### Grid Structure
```
[Header — 44px fixed]
[Sidebar (260px, resizable 200-420px) | Main Content]
```

### Header (44px)
- Logo (left)
- Status chip with blinking LED (center-left)
- Action buttons: Reload, Import, Export (center-right)
- Theme toggle (right)

### Sidebar (260px default)
- Search input with icon
- Action buttons: New Profile, New Category
- Profile list organized by categories
- Each category: collapsible, colored dot indicator
- Each profile item: type color bar (left edge), name, cost badge, context menu
- Resize handle: 6px wide, visible on hover

### Main Area
- Identity bar: status dot, account ID, ARN
- Favorites bar: labeled quick-action buttons
- Terminal: chrome bar + output area + input line
- Sheet panel: slides from right, 380px wide

## Spacing
- Base unit: 4px
- Component padding: 8px-12px
- Section gaps: 16px
- Card padding: 16px
- Dialog padding: 24px

## Borders and Shadows
- Border radius: 6px (small), 8px (medium), 10px (large/dialogs)
- Borders: 1px solid var(--border)
- No box shadows in dark mode
- Subtle shadow in light mode: `0 1px 3px rgba(0,0,0,0.08)`

## Animations

### Easing
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Transitions
- Hover effects: 150ms ease-out
- Panel open/close: 200ms ease-out
- Dialog appear: 150ms scale(0.95) -> scale(1) + opacity
- Context menu: 100ms fade-in with slight scale
- Theme switch: 200ms on background/color properties
- Toast: slide-in from right, 200ms

### Framer Motion (React)
```tsx
// Dialog animation
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
/>

// Sheet slide-in
<motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
/>
```

## Interactive States
- Hover: background shifts one level lighter (bg-2 -> bg-3)
- Active/pressed: background shifts two levels lighter
- Focus: 2px solid var(--accent) outline with 2px offset
- Selected: accent-dim background + accent left border
- Disabled: 40% opacity, cursor: not-allowed

## Profile Type Indicators
- **SSO**: Green (#22c55e) — 3px left border on profile item
- **Credentials**: Violet (#8b5cf6) — 3px left border
- **Role**: Amber (#f59e0b) — 3px left border

## Terminal Styling
```css
/* Terminal output colors */
.prompt  { color: #3b82f6; }  /* Blue — command prompt */
.command { color: #06b6d4; }  /* Cyan — user commands */
.error   { color: #ef4444; }  /* Red — errors */
.info    { color: #f59e0b; }  /* Amber — informational */
.detail  { color: #71717a; }  /* Gray — metadata */
.output  { color: #fafafa; }  /* White — normal output */
```

## Icons
- Use emoji for AWS service icons (EC2: server, S3: bucket, etc.)
- UI actions: minimal SVG icons, 16x16px, 1.5px stroke
- No filled icons — always outline style
- Match icon color to surrounding text color
