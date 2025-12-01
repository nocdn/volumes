"use client";

import { useState, useRef, useEffect } from "react";
import type { LucideIcon } from "lucide-react";

interface EditableMenuItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  isSelected: boolean;
  onSave: (newValue: string) => void;
  onHover: () => void;
  onClose?: () => void;
}

export default function EditableMenuItem({
  icon: Icon,
  label,
  value,
  isSelected,
  onSave,
  onHover,
  onClose,
}: EditableMenuItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit value when value prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  function handleClick() {
    setIsEditing(true);
    setEditValue(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== value) {
        onSave(trimmed);
        onClose?.();
      }
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  }

  function handleBlur() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
      // Don't close on blur - only on explicit Enter
    }
    setIsEditing(false);
  }

  return (
    <div
      className={`w-full rounded-[14px]  ${isSelected ? "bg-[#454545]" : ""}`}
      onMouseEnter={onHover}
      onClick={!isEditing ? handleClick : undefined}
    >
      <Icon size={16} strokeWidth={2.5} className="shrink-0" />
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="flex-1 bg-transparent outline-none text-white min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate">{label}</span>
      )}
    </div>
  );
}
