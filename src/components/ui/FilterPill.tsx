'use client';

import { X } from 'lucide-react';

interface FilterPillProps {
  label: string;
  onRemove: () => void;
  color?: string;
}

export function FilterPill({ label, onRemove, color }: FilterPillProps) {
  return (
    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
      {color && (
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:text-blue-600 transition"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface FilterPillsProps {
  pills: Array<{
    id: string;
    label: string;
    color?: string;
  }>;
  onRemovePill: (id: string) => void;
  onClearAll?: () => void;
}

export default function FilterPills({
  pills,
  onRemovePill,
  onClearAll,
}: FilterPillsProps) {
  if (pills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {pills.map((pill) => (
        <FilterPill
          key={pill.id}
          label={pill.label}
          color={pill.color}
          onRemove={() => onRemovePill(pill.id)}
        />
      ))}
      {onClearAll && pills.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
