'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateRangeFilterProps } from '@/lib/interfaces';

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value.startDate || null
  );

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const handleQuickSelect = (
    type: 'days' | 'weeks' | 'months' | 'years',
    n: number
  ) => {
    onChange({ type, value: n });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onChange({ type: 'custom', startDate: date, endDate: date });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      selectedDate &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <div className="space-y-4">
      {/* Quick Select Buttons */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Last</label>
        <div className="space-y-2">
          {[
            { label: 'All time', type: 'all', value: undefined },
            { label: 'Last 7 days', type: 'days', value: 7 },
            { label: 'Last 30 days', type: 'days', value: 30 },
            { label: 'Last 3 months', type: 'months', value: 3 },
            { label: 'Last year', type: 'years', value: 1 },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => {
                if (option.type === 'all') {
                  onChange({ type: 'all' });
                } else {
                  handleQuickSelect(
                    option.type as 'days' | 'weeks' | 'months' | 'years',
                    option.value || 0
                  );
                }
              }}
              className={`w-full text-left px-3 py-2 rounded border transition ${
                value.type === option.type
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="border border-gray-200 rounded-lg p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
              )
            }
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-900">
            {currentMonth.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
              )
            }
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-xs font-semibold text-gray-600 text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="h-8 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((date, idx) => (
            <div key={idx} className="h-8">
              {date ? (
                <button
                  onClick={() => handleDateSelect(date)}
                  className={`w-full h-full rounded text-sm font-medium transition ${
                    isSelected(date)
                      ? 'bg-blue-600 text-white'
                      : isToday(date)
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {date.getDate()}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
