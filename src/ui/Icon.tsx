// Shared, decorative 24px line icons. Accessible names belong to the surrounding controls.
const paths = {
  "home": "M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8",
  "bolt": "m13 2-9 12h7l-1 8 10-12h-7z",
  "log": "M6 3h12v18H6zM9 7h6M9 11h6M9 15h4",
  "user": "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",
  "more": "M4 6h16M4 12h16M4 18h16",
  "body": "M3 8v8M7 5v14M17 5v14M21 8v8M7 12h10",
  "book": "M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-2-1-6-2-10 1",
  "rest": "M3 5v16M3 17h18v4M3 10h6v7M9 10h10l2 3v4",
  "health": "M12 21 3 12C-3 4 7 0 12 7 17 0 27 4 21 12z",
  "clinic": "M5 3h14v18H5zM9 9h6M12 6v6M10 21v-5h4v5",
  "spark": "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  "target": "M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M12 12l9-9M16 3h5v5",
  "strain": "M8 3h8M9 3v10a5 5 0 1 0 6 0V3M12 8v9",
  "camera": "M3 7h4l2-3h6l2 3h4v13H3zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  "shield": "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z",
  "tools": "m14 6 4 4M3 21l9-9M14 3a6 6 0 0 0-2 9 6 6 0 0 0 9-2l-5 1-3-3z",
  "briefcase": "M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3",
  "trend": "m3 17 6-6 4 4 8-11M15 4h6v6",
  "door": "M4 21h16M6 21V3h12v18M14 12h1",
  "people": "M9 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M21 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M1 21v-3a5 5 0 0 1 10 0v3M13 21v-3a5 5 0 0 1 10 0v3",
  "glass": "M3 3h18l-9 10zM12 13v8M7 21h10",
  "box": "m12 2 10 5v10l-10 5-10-5V7zM2 7l10 5 10-5M12 12v10M7 4.5l10 5",
  "hand": "M8 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v10c0 8-12 9-15 2l-3-5a2 2 0 0 1 3-2l3 3",
  "fight": "M4 14V8h4V5h4v3h4V6h4v10l-5 6H8z",
  "mask": "M2 7c6 3 14 3 20 0l-2 10-6-2-2-3-2 3-6 2zM5 11h3M16 11h3",
  "dice": "M3 3h18v18H3zM7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01",
  "money": "M2 5h20v14H2zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 12h1M18 12h1",
  "lock": "M5 10h14v12H5zM8 10V6a4 4 0 0 1 8 0v4M12 15v3",
  "mind": "M9 3C4 2 3 7 5 9c-5 3-2 9 2 9 0 4 5 4 5 1V5c0-3-3-3-3-2M15 3c5-1 6 4 4 6 5 3 2 9-2 9 0 4-5 4-5 1",
  "chat": "M3 3h18v14H9l-6 4zM7 7h10M7 11h6",
  "star": "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
  "warning": "m12 2 10 19H2zM12 8v6M12 17h.01",
  "pin": "M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 0 1 14 0M14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  "id": "M2 4h20v16H2zM7 8h2v3H7zM5 16v-2h6v2M14 9h5M14 14h5",
  "scales": "M12 3v18M7 21h10M3 7h18M6 7l-4 8h8zM18 7l-4 8h8z",
  "seed": "M12 22V12M12 16C3 16 2 10 3 6c7 0 9 3 9 10M12 12c0-7 4-10 9-10 0 7-3 10-9 10"
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
