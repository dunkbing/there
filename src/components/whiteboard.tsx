"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export function Whiteboard() {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border">
      <Tldraw />
    </div>
  );
}
