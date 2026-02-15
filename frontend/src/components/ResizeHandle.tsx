import { useCallback, useRef } from "react";

export function ResizeHandle() {
  const dragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const w = Math.min(420, Math.max(200, e.clientX));
      document.documentElement.style.setProperty("--sidebar-w", `${w}px`);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute top-0 -right-[3px] bottom-0 w-1.5 cursor-col-resize z-[15] hover:bg-[var(--ac)]/20 transition-colors"
    />
  );
}
