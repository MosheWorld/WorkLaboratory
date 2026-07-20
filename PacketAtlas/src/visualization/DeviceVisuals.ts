export const DeviceVisuals = Object.freeze({
  draw(
    ctx: CanvasRenderingContext2D,
    type: 'phone' | 'laptop' | 'tablet',
    x: number,
    y: number,
    { active = false, scale = 1 }: { active?: boolean; scale?: number } = {},
  ) {
    const color = active ? '#73efd7' : '#8aa6b8';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = active ? '#143d38' : '#0c1925';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = active ? color : 'transparent';
    ctx.shadowBlur = active ? 12 : 0;
    if (type === 'phone') {
      this.roundedRect(ctx, -8, -14, 16, 28, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -10);
      ctx.lineTo(3, -10);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 10, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    } else if (type === 'laptop') {
      this.roundedRect(ctx, -14, -11, 28, 19, 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, 11);
      ctx.lineTo(18, 11);
      ctx.lineTo(14, 8);
      ctx.lineTo(-14, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      this.roundedRect(ctx, -11, -15, 22, 30, 3);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 11, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  },
  roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  },
});
