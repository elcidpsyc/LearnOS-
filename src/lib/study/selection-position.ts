export function selectionPosition(
  anchor: { left: number; top: number; rectTop?: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number; left?: number; top?: number },
) {
  const x = viewport.left ?? 0,
    y = viewport.top ?? 0,
    padding = 12;
  const below = anchor.top + 10;
  const preferred =
    below + size.height <= y + viewport.height - padding
      ? below
      : (anchor.rectTop ?? anchor.top - 24) - size.height - 10;
  return {
    left: Math.max(
      x + padding,
      Math.min(anchor.left, x + viewport.width - size.width - padding),
    ),
    top: Math.max(
      y + padding,
      Math.min(preferred, y + viewport.height - size.height - padding),
    ),
  };
}
