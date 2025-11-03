"use client";

import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export function Whiteboard() {
  return (
    <div className="w-full h-full rounded-lg overflow-hidden ">
      <Tldraw />
    </div>
  );
}
