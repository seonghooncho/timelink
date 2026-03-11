export const getDraggedScrollTop = (startScrollTop: number, startY: number, currentY: number) =>
  startScrollTop - (currentY - startY);
