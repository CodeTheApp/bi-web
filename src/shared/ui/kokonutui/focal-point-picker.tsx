"use client";
/**
 * @author: @dorianbaffier
 * @description: Focal Point Picker — square avatar pan/zoom adaptation
 * @version: 1.0.0
 * @date: 2026-10-16
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 * Source: https://github.com/kokonut-labs/kokonutui/blob/main/components/kokonutui/focal-point-picker.tsx
 * The crop window, pointer capture and keyboard movement are adapted from the official component.
 */
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  cropWindow,
  imageCropStyle,
  clamp,
  type FocalPoint,
} from "@/shared/lib/image-crop";
import { Minus, Plus, RotateCw } from "@/shared/ui/icons/lucide";
import { Button } from "@/shared/ui/button";
import { ControlTooltip } from "@/shared/ui/admin/ui";

export type AvatarCropValue = { point: FocalPoint; zoom: number };
export interface FocalPointPickerProps {
  src: string;
  imageRatio: number;
  value: AvatarCropValue;
  onValueChange: (value: AvatarCropValue) => void;
  disabled?: boolean;
}

export default function FocalPointPicker({
  src,
  imageRatio,
  value,
  onValueChange,
  disabled = false,
}: FocalPointPickerProps) {
  const uid = useId();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    point: FocalPoint;
    width: number;
    height: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const crop = cropWindow(value.point, imageRatio, 1, value.zoom);
  const position = imageCropStyle(crop);
  const movePoint = (point: FocalPoint) =>
    onValueChange({
      ...value,
      point: {
        x: clamp(point.x, crop.w / 2, 1 - crop.w / 2),
        y: clamp(point.y, crop.h / 2, 1 - crop.h / 2),
      },
    });
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.isPrimary || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      point: { x: crop.left + crop.w / 2, y: crop.top + crop.h / 2 },
      width: rect.width,
      height: rect.height,
    };
    setDragging(true);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || disabled) return;
    movePoint({
      x: start.point.x - ((event.clientX - start.x) / start.width) * crop.w,
      y: start.point.y - ((event.clientY - start.y) / start.height) * crop.h,
    });
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (!move || disabled) return;
    event.preventDefault();
    movePoint({
      x: crop.left + crop.w / 2 + move[0],
      y: crop.top + crop.h / 2 + move[1],
    });
  };
  const setZoom = (zoom: number) =>
    onValueChange({ ...value, zoom: clamp(zoom, 1, 4) });
  return (
    <div className="avatar-crop-picker">
      <div
        className={`avatar-crop-frame${dragging ? " is-dragging" : ""}`}
        ref={frame}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} style={position} />
        <span className="avatar-crop-mask" aria-hidden="true" />
        <span className="avatar-crop-corners" aria-hidden="true">
          {["top-left", "top-right", "bottom-left", "bottom-right"].map(
            (corner) => (
              <span className={corner} key={corner} />
            ),
          )}
        </span>
        <button
          type="button"
          className="avatar-crop-handle"
          onKeyDown={keyDown}
          disabled={disabled}
          aria-label="Reposicionar foto. Use as setas para ajustar o enquadramento e Shift para mover mais."
        />
      </div>
      <div className="avatar-crop-controls">
        <div className="avatar-crop-zoom">
          <label htmlFor={`${uid}-zoom`}>
            Zoom <output>{Math.round(value.zoom * 100)}%</output>
          </label>
          <div>
            <ControlTooltip label="Diminuir zoom">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled || value.zoom <= 1}
                onClick={() => setZoom(value.zoom - 0.1)}
                aria-label="Diminuir zoom"
              >
                <Minus size={15} />
              </Button>
            </ControlTooltip>
            <input
              id={`${uid}-zoom`}
              type="range"
              min={1}
              max={4}
              step={0.02}
              value={value.zoom}
              disabled={disabled}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <ControlTooltip label="Aumentar zoom">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled || value.zoom >= 4}
                onClick={() => setZoom(value.zoom + 0.1)}
                aria-label="Aumentar zoom"
              >
                <Plus size={15} />
              </Button>
            </ControlTooltip>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onValueChange({ point: { x: 0.5, y: 0.5 }, zoom: 1 })
            }
          >
            <RotateCw size={14} />
            Recomeçar
          </Button>
        </div>
        <div className="avatar-crop-preview">
          <span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Prévia circular da foto do perfil"
              draggable={false}
              style={position}
            />
          </span>
          <small>Prévia</small>
        </div>
      </div>
    </div>
  );
}
