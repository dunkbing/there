"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./button";

interface SliderSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

const SliderSheet = ({ open, onClose, title, children }: SliderSheetProps) => {
  const [isMobile, setIsMobile] = useState(false);

  // Detect if user is on mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Animation variants for desktop (slide from right)
  const desktopVariants = {
    hidden: { x: "100%" },
    visible: { x: 0 },
  };

  // Animation variants for mobile (bottom sheet)
  const mobileVariants = {
    hidden: { y: "100%" },
    visible: { y: 0 },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          {isMobile && (
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
          )}

          {/* Sheet */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={isMobile ? mobileVariants : desktopVariants}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className={` bg-background text-foreground shadow-2xl
              ${
                isMobile
                  ? "bottom-0 left-0 w-full h-[85vh] z-50 rounded-t-2xl"
                  : "top-0 border right-0 h-full xl:w-[300px] 2xl:w-[350px] rounded-2xl"
              }
              flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-medium text-lg">{title}</h2>
              <Button variant={"ghost"} size={"icon"} onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SliderSheet;
