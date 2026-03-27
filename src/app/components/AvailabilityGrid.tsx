import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Check, Minus, Trash2 } from 'lucide-react';
import { CellState, Person, usePlans } from '../context/PlansContext';

interface AvailabilityGridProps {
  planId: string;
  people: Person[];
  dates: string[];
  excludedPeople: string[];
}

function cycleState(current: CellState): CellState {
  if (current === 'blank') return 'available';
  if (current === 'available') return 'unavailable';
  return 'blank';
}

function CellDisplay({ state, selected }: { state: CellState; selected: boolean }) {
  const base =
    'w-full h-full flex items-center justify-center transition-colors select-none cursor-pointer rounded';
  if (state === 'available')
    return (
      <div
        className={`${base} ${selected ? 'bg-green-300 ring-2 ring-blue-400 ring-inset' : 'bg-green-100 hover:bg-green-200'}`}
      >
        <Check size={14} className="text-green-700 stroke-[2.5]" />
      </div>
    );
  if (state === 'unavailable')
    return (
      <div
        className={`${base} ${selected ? 'bg-red-300 ring-2 ring-blue-400 ring-inset' : 'bg-red-100 hover:bg-red-200'}`}
      >
        <X size={14} className="text-red-600 stroke-[2.5]" />
      </div>
    );
  return (
    <div
      className={`${base} ${selected ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : 'bg-gray-50 hover:bg-gray-100'}`}
    />
  );
}

export function AvailabilityGrid({ planId, people, dates, excludedPeople }: AvailabilityGridProps) {
  const { updateCellState, updatePersonNote, bulkUpdateCells, removePerson } = usePlans();

  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const dragStartRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  const cellKey = (personId: string, date: string) => `${personId}:${date}`;

  const handleCellMouseDown = useCallback(
    (personId: string, date: string, e: React.MouseEvent) => {
      e.preventDefault();
      dragStartRef.current = cellKey(personId, date);
      isDraggingRef.current = false;
      setSelectedCells(new Set([cellKey(personId, date)]));
    },
    []
  );

  const handleCellMouseEnter = useCallback(
    (personId: string, date: string) => {
      if (dragStartRef.current !== null) {
        const key = cellKey(personId, date);
        if (key !== dragStartRef.current) {
          isDraggingRef.current = true;
        }
        setSelectedCells(prev => {
          const next = new Set(prev);
          next.add(dragStartRef.current!);
          next.add(key);
          return next;
        });
      }
    },
    []
  );

  const handleCellMouseUp = useCallback(
    (personId: string, date: string) => {
      if (!isDraggingRef.current) {
        const current = people.find(p => p.id === personId)?.availability[date] ?? 'blank';
        updateCellState(planId, personId, date, cycleState(current as CellState));
        setSelectedCells(new Set());
      }
      dragStartRef.current = null;
    },
    [people, planId, updateCellState]
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      dragStartRef.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const clearSelection = () => setSelectedCells(new Set());

  const bulkSet = (state: CellState | 'blank') => {
    const cells = Array.from(selectedCells).map(k => {
      const [personId, date] = k.split(':');
      return { personId, date };
    });
    bulkUpdateCells(planId, cells, state);
    setSelectedCells(new Set());
  };

  const excludedSet = new Set(excludedPeople);

  // Compute "everyone available" row
  const everyoneAvailable = (date: string): boolean => {
    const included = people.filter(p => !excludedSet.has(p.id));
    if (included.length === 0) return false;
    return included.every(p => (p.availability[date] ?? 'blank') === 'available');
  };

  const hasSelection = selectedCells.size > 0 && isDraggingRef.current !== false;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Bulk action bar */}
      {selectedCells.size > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg mb-2 flex-shrink-0">
          <span className="text-blue-700 text-sm mr-1">{selectedCells.size} cells selected</span>
          <button
            onClick={() => bulkSet('available')}
            className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm transition-colors"
          >
            <Check size={13} /> Mark Available
          </button>
          <button
            onClick={() => bulkSet('unavailable')}
            className="flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-sm transition-colors"
          >
            <X size={13} /> Mark Unavailable
          </button>
          <button
            onClick={() => bulkSet('blank')}
            className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm transition-colors"
          >
            <Minus size={13} /> Clear
          </button>
          <button
            onClick={clearSelection}
            className="ml-auto text-blue-400 hover:text-blue-600 text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="border-collapse" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr>
              {/* Top-left corner */}
              <th
                className="sticky left-0 top-0 z-30 bg-gray-50 border-b border-r border-gray-200 text-left px-3 py-2"
                style={{ minWidth: 160, width: 160 }}
              >
                <span className="text-xs text-gray-500 uppercase tracking-wide">Person</span>
              </th>
              {/* Date columns */}
              {dates.map(date => {
                const d = parseISO(date);
                return (
                  <th
                    key={date}
                    className="sticky top-0 z-20 bg-gray-50 border-b border-r border-gray-200 text-center px-1 py-2"
                    style={{ minWidth: 52, width: 52 }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-gray-400">{format(d, 'EEE')}</span>
                      <span className="text-sm text-gray-700">{format(d, 'M/d')}</span>
                    </div>
                  </th>
                );
              })}
              {/* Notes top-right corner */}
              <th
                className="sticky top-0 right-0 z-30 bg-gray-50 border-b border-l border-gray-200 text-left px-3 py-2"
                style={{ minWidth: 200, width: 200 }}
              >
                <span className="text-xs text-gray-500 uppercase tracking-wide">Notes / Excuses</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {people.map(person => {
              const isExcluded = excludedSet.has(person.id);
              return (
                <tr
                  key={person.id}
                  className={`group ${isExcluded ? 'opacity-40' : ''} hover:bg-gray-50/50`}
                >
                  {/* Name cell */}
                  <td
                    className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-2"
                    style={{ minWidth: 160, width: 160 }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm text-gray-800 truncate">{person.name}</span>
                      <button
                        onClick={() => removePerson(planId, person.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  {/* Availability cells */}
                  {dates.map(date => {
                    const state: CellState = person.availability[date] ?? 'blank';
                    const key = cellKey(person.id, date);
                    const isSelected = selectedCells.has(key);
                    return (
                      <td
                        key={date}
                        className="border-b border-r border-gray-200 p-1"
                        style={{ minWidth: 52, width: 52, height: 44 }}
                        onMouseDown={e => handleCellMouseDown(person.id, date, e)}
                        onMouseEnter={() => handleCellMouseEnter(person.id, date)}
                        onMouseUp={() => handleCellMouseUp(person.id, date)}
                      >
                        <CellDisplay state={state} selected={isSelected} />
                      </td>
                    );
                  })}
                  {/* Notes cell */}
                  <td
                    className="sticky right-0 z-10 bg-white border-b border-l border-gray-200 px-2 py-1"
                    style={{ minWidth: 200, width: 200 }}
                  >
                    <input
                      type="text"
                      value={person.note}
                      onChange={e => updatePersonNote(planId, person.id, e.target.value)}
                      placeholder="Add a note…"
                      className="w-full text-sm text-gray-600 bg-transparent border-none outline-none placeholder-gray-300 focus:placeholder-gray-400"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td
                className="sticky left-0 z-10 bg-gray-50 border-t-2 border-r border-gray-200 px-3 py-2"
                style={{ minWidth: 160, width: 160 }}
              >
                <span className="text-xs text-gray-500 uppercase tracking-wide">Everyone ✓</span>
              </td>
              {dates.map(date => {
                const allAvail = everyoneAvailable(date);
                return (
                  <td
                    key={date}
                    className="border-t-2 border-r border-gray-200 p-1"
                    style={{ minWidth: 52, width: 52, height: 40 }}
                  >
                    <div
                      className={`w-full h-full flex items-center justify-center rounded ${
                        allAvail ? 'bg-green-100' : 'bg-gray-50'
                      }`}
                    >
                      {allAvail ? (
                        <Check size={14} className="text-green-600 stroke-[2.5]" />
                      ) : null}
                    </div>
                  </td>
                );
              })}
              <td
                className="sticky right-0 z-10 bg-gray-50 border-t-2 border-l border-gray-200"
                style={{ minWidth: 200, width: 200 }}
              />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
