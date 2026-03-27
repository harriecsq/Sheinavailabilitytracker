import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Check, Trash2, Pencil } from 'lucide-react';
import { CellState, Person, usePlans } from '../context/PlansContext';

interface AvailabilityGridProps {
  planId: string;
  people: Person[];
  dates: string[];
  excludedPeople: string[];
  selectedCells: Set<string>;
  setSelectedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function cycleState(current: CellState): CellState {
  if (current === 'blank') return 'available';
  if (current === 'available') return 'unavailable';
  return 'blank';
}

function CellDisplay({ state, selected }: { state: CellState; selected: boolean }) {
  const base =
    'w-full h-full flex items-center justify-center transition-colors select-none cursor-pointer rounded';

  if (state === 'available') {
    return (
      <div
        className={`${base} ${
          selected
            ? 'bg-green-300 ring-2 ring-blue-400 ring-inset'
            : 'bg-green-100 hover:bg-green-200'
        }`}
      >
        <Check size={14} className="text-green-700 stroke-[2.5]" />
      </div>
    );
  }

  if (state === 'unavailable') {
    return (
      <div
        className={`${base} ${
          selected
            ? 'bg-red-300 ring-2 ring-blue-400 ring-inset'
            : 'bg-red-100 hover:bg-red-200'
        }`}
      >
        <X size={14} className="text-red-600 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div
      className={`${base} ${
        selected
          ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset'
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
    />
  );
}

export function AvailabilityGrid({
  planId,
  people,
  dates,
  excludedPeople,
  selectedCells,
  setSelectedCells,
}: AvailabilityGridProps) {
  const {
    updateCellState,
    updatePersonNote,
    removePerson,
    renamePerson,
  } = usePlans();

  const dragStartRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonName, setEditingPersonName] = useState('');
  const [isSavingPersonName, setIsSavingPersonName] = useState(false);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    people.forEach((person) => {
      nextDrafts[person.id] = person.note ?? '';
    });
    setDraftNotes(nextDrafts);
  }, [people]);

  const cellKey = (personId: string, date: string) => `${personId}:${date}`;

  const handleCellMouseDown = useCallback(
    (personId: string, date: string, e: React.MouseEvent) => {
      e.preventDefault();
      dragStartRef.current = cellKey(personId, date);
      isDraggingRef.current = false;
      setSelectedCells(new Set([cellKey(personId, date)]));
    },
    [setSelectedCells]
  );

  const handleCellMouseEnter = useCallback(
    (personId: string, date: string) => {
      if (dragStartRef.current !== null) {
        const key = cellKey(personId, date);
        if (key !== dragStartRef.current) {
          isDraggingRef.current = true;
        }
        setSelectedCells((prev) => {
          const next = new Set(prev);
          next.add(dragStartRef.current!);
          next.add(key);
          return next;
        });
      }
    },
    [setSelectedCells]
  );

  const handleCellMouseUp = useCallback(
    (personId: string, date: string) => {
      if (!isDraggingRef.current) {
        const current = people.find((p) => p.id === personId)?.availability[date] ?? 'blank';
        updateCellState(planId, personId, date, cycleState(current as CellState));
        setSelectedCells(new Set());
      }
      dragStartRef.current = null;
    },
    [people, planId, setSelectedCells, updateCellState]
  );

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      dragStartRef.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const excludedSet = new Set(excludedPeople);

  const everyoneStatus = (date: string): CellState => {
    const included = people.filter((p) => !excludedSet.has(p.id));
    if (included.length === 0) return 'blank';

    const states = included.map((p) => p.availability[date] ?? 'blank');

    if (states.some((state) => state === 'unavailable')) {
      return 'unavailable';
    }

    if (states.some((state) => state === 'available')) {
      return 'available';
    }

    return 'blank';
  };

  const handleNoteChange = (personId: string, value: string) => {
    setDraftNotes((prev) => ({
      ...prev,
      [personId]: value,
    }));
  };

  const handleNoteBlur = async (personId: string, currentSavedNote: string) => {
    const draftValue = draftNotes[personId] ?? '';
    if (draftValue === (currentSavedNote ?? '')) return;
    await updatePersonNote(planId, personId, draftValue);
  };

  const startEditingPerson = (personId: string, currentName: string) => {
    setEditingPersonId(personId);
    setEditingPersonName(currentName);
    setIsSavingPersonName(false);
  };

  const cancelEditingPerson = () => {
    setEditingPersonId(null);
    setEditingPersonName('');
    setIsSavingPersonName(false);
  };

  const commitPersonRename = async (personId: string, originalName: string) => {
    if (isSavingPersonName) return;

    const trimmed = editingPersonName.trim();

    if (!trimmed) return;
    if (trimmed === originalName.trim()) {
      cancelEditingPerson();
      return;
    }

    const duplicateExists = people.some(
      (p) => p.id !== personId && p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (duplicateExists) {
      return;
    }

    setIsSavingPersonName(true);
    const success = await renamePerson(planId, personId, trimmed);
    setIsSavingPersonName(false);

    if (success) {
      cancelEditingPerson();
    }
  };

  return (
    <div className="h-full">
      <div className="h-full overflow-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="border-collapse" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-30 bg-gray-50 border-b border-r border-gray-200 text-left px-3 py-2"
                style={{ width: 160, minWidth: 160 }}
              >
                <span className="text-xs text-gray-500 uppercase tracking-wide">Person</span>
              </th>

              {dates.map((date) => {
                const d = parseISO(date);
                return (
                  <th
                    key={date}
                    className="sticky top-0 z-20 bg-gray-50 border-b border-r border-gray-200 text-center px-1 py-2"
                    style={{ width: 52, minWidth: 52 }}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-gray-400">{format(d, 'EEE')}</span>
                      <span className="text-sm text-gray-700">{format(d, 'M/d')}</span>
                    </div>
                  </th>
                );
              })}

              <th
                className="sticky top-0 right-0 z-30 bg-gray-50 border-b border-l border-gray-200 text-left px-3 py-2"
                style={{ width: 240, minWidth: 240, maxWidth: 240 }}
              >
                <span className="text-xs text-gray-500 uppercase tracking-wide">Notes / Excuses</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {people.map((person) => {
              const isExcluded = excludedSet.has(person.id);
              const isEditing = editingPersonId === person.id;

              return (
                <tr
                  key={person.id}
                  className={`group ${isExcluded ? 'opacity-40' : ''} hover:bg-gray-50/50`}
                >
                  <td
                    className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-2"
                    style={{ width: 160, minWidth: 160, height: 40 }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            autoFocus
                            type="text"
                            value={editingPersonName}
                            onChange={(e) => setEditingPersonName(e.target.value)}
                            onBlur={() => {
                              void commitPersonRename(person.id, person.name);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void commitPersonRename(person.id, person.name);
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEditingPerson();
                              }
                            }}
                            className="min-w-0 flex-1 rounded border border-blue-300 px-2 py-1 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-100"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              void commitPersonRename(person.id, person.name);
                            }}
                            className="text-green-600 hover:text-green-700"
                            title="Save"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={cancelEditingPerson}
                            className="text-gray-400 hover:text-gray-600"
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            onDoubleClick={() => startEditingPerson(person.id, person.name)}
                            className="text-sm text-gray-800 truncate cursor-text flex-1"
                            title="Double-click to rename"
                          >
                            {person.name}
                          </span>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => startEditingPerson(person.id, person.name)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-600"
                              title="Rename"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => removePerson(planId, person.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                              title="Remove"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>

                  {dates.map((date) => {
                    const state: CellState = person.availability[date] ?? 'blank';
                    const key = cellKey(person.id, date);
                    const isSelected = selectedCells.has(key);

                    return (
                      <td
                        key={date}
                        className="border-b border-r border-gray-200 p-1"
                        style={{ width: 52, minWidth: 52, height: 40 }}
                        onMouseDown={(e) => handleCellMouseDown(person.id, date, e)}
                        onMouseEnter={() => handleCellMouseEnter(person.id, date)}
                        onMouseUp={() => handleCellMouseUp(person.id, date)}
                      >
                        <CellDisplay state={state} selected={isSelected} />
                      </td>
                    );
                  })}

                  <td
                    className="sticky right-0 z-10 bg-white border-b border-l border-gray-200 p-0"
                    style={{ width: 240, minWidth: 240, maxWidth: 240, height: 40 }}
                  >
                    <textarea
                      value={draftNotes[person.id] ?? ''}
                      onChange={(e) => handleNoteChange(person.id, e.target.value)}
                      onBlur={() => handleNoteBlur(person.id, person.note ?? '')}
                      placeholder="Add a note or excuse…"
                      rows={1}
                      className="block w-full h-[40px] resize-none overflow-auto border-0 bg-transparent px-3 py-2 text-sm text-gray-600 outline-none placeholder-gray-300"
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
                style={{ width: 160, minWidth: 160, height: 40 }}
              >
                <span className="text-xs text-gray-500 uppercase tracking-wide">Everyone ✓</span>
              </td>

              {dates.map((date) => {
                const everyoneState = everyoneStatus(date);

                return (
                  <td
                    key={date}
                    className="border-t-2 border-r border-gray-200 p-1"
                    style={{ width: 52, minWidth: 52, height: 40 }}
                  >
                    <div
                      className={`w-full h-full flex items-center justify-center rounded ${
                        everyoneState === 'available'
                          ? 'bg-green-100'
                          : everyoneState === 'unavailable'
                            ? 'bg-red-100'
                            : 'bg-gray-50'
                      }`}
                    >
                      {everyoneState === 'available' ? (
                        <Check size={14} className="text-green-600 stroke-[2.5]" />
                      ) : everyoneState === 'unavailable' ? (
                        <X size={14} className="text-red-600 stroke-[2.5]" />
                      ) : null}
                    </div>
                  </td>
                );
              })}

              <td
                className="sticky right-0 z-10 bg-gray-50 border-t-2 border-l border-gray-200"
                style={{ width: 240, minWidth: 240, maxWidth: 240, height: 40 }}
              />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}