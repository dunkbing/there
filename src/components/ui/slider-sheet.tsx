"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";

interface SliderSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  side?: "left" | "right" | "bottom" | "top";
}

const SliderSheet = ({
  open,
  onClose,
  title,
  children,
  side = "right",
}: SliderSheetProps) => {
  // Define direction-based animation
  const variants = {
    right: { hidden: { x: "100%" }, visible: { x: 0 } },
    left: { hidden: { x: "-100%" }, visible: { x: 0 } },
    bottom: { hidden: { y: "100%" }, visible: { y: 0 } },
    top: { hidden: { y: "-100%" }, visible: { y: 0 } },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants[side]}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed z-50 bg-background text-foreground shadow-xl 
              ${side === "right" ? "top-0 right-0 h-full w-80" : ""}
              ${side === "left" ? "top-0 left-0 h-full w-80" : ""}
              ${side === "bottom" ? "bottom-0 left-0 w-full h-72" : ""}
              ${side === "top" ? "top-0 left-0 w-full h-72" : ""}
              rounded-t-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-medium text-lg">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SliderSheet;
