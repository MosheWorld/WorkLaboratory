import type { NetworkScene } from './NetworkScene';

export function bindSceneInput(scene: NetworkScene, signal: AbortSignal) {
  scene.canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      scene.followId = null;
      scene.setZoom(scene.zoom * Math.exp(-event.deltaY * 0.001));
    },
    { passive: false, signal },
  );
  scene.canvas.addEventListener(
    'pointerdown',
    (event) => {
      scene.followId = null;
      scene.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        sx: event.clientX,
        sy: event.clientY,
      });
      scene.canvas.setPointerCapture(event.pointerId);
      scene.dragMoved = false;
    },
    { signal },
  );
  scene.canvas.addEventListener(
    'pointermove',
    (event) => {
      const pointer = scene.pointers.get(event.pointerId);
      if (!pointer) return;
      const prev = [...scene.pointers.values()];
      if (prev.length === 2) {
        const other = prev.find((candidate) => candidate !== pointer);
        if (!other) return;
        const before = Math.hypot(pointer.x - other.x, pointer.y - other.y),
          after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        if (before > 5) scene.setZoom((scene.zoom * after) / before);
        scene.dragMoved = true;
      } else {
        const deltaX = event.clientX - pointer.x,
          deltaY = event.clientY - pointer.y;
        if (event.shiftKey || scene.view !== 'globe') {
          scene.pan.x += deltaX;
          scene.pan.y += deltaY;
        } else {
          scene.yaw += deltaX * 0.005;
          scene.pitch = Math.max(-1.4, Math.min(1.4, scene.pitch + deltaY * 0.005));
        }
        if (Math.hypot(event.clientX - pointer.sx, event.clientY - pointer.sy) > 5)
          scene.dragMoved = true;
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    },
    { signal },
  );
  scene.canvas.addEventListener(
    'pointerup',
    (event) => {
      if (!scene.dragMoved && scene.pointers.size === 1) {
        const bounds = scene.canvas.getBoundingClientRect(),
          x = event.clientX - bounds.left,
          y = event.clientY - bounds.top,
          hit = scene.hits.find(
            (candidate) => Math.hypot(candidate.x - x, candidate.y - y) < candidate.r,
          );
        if (hit) hit.type === 'packet' ? scene.selectPacket(hit.id) : scene.selectNode(hit.id);
      }
      scene.pointers.delete(event.pointerId);
    },
    { signal },
  );
  scene.canvas.addEventListener(
    'pointercancel',
    (event) => scene.pointers.delete(event.pointerId),
    {
      signal,
    },
  );
}
