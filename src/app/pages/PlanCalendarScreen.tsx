import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import {
  ArrowLeft,
  UserPlus,
  Pencil,
  Trash2,
  Check,
  X,
  CalendarRange,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePlans } from '../context/PlansContext';
import { AvailabilityGrid } from '../components/AvailabilityGrid';

function formatDateRange(startDate: string, endDate: string) {
  try {
    return `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d, yyyy')}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

function getDates(startDate: string, endDate: string): string[] {
  try {
    return eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    }).map(d => format(d, 'yyyy-MM-dd'));
  } catch {
    return [];
  }
}

export function PlanCalendarScreen() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { plans, addPerson, deletePlan, updatePlan, togglePersonExclusion } = usePlans();

  const plan = plans.find(p => p.id === planId);

  const [newPersonName, setNewPersonName] = useState('');
  const [addError, setAddError] = useState('');

  // Edit plan modal
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editError, setEditError] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Filter panel collapse
  const [filterOpen, setFilterOpen] = useState(true);

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Plan not found.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  const dates = useMemo(() => getDates(plan.startDate, plan.endDate), [plan.startDate, plan.endDate]);
  const excludedSet = new Set(plan.excludedPeople);

  const handleAddPerson = () => {
    const name = newPersonName.trim();
    if (!name) { setAddError('Enter a name.'); return; }
    if (plan.people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setAddError('That name is already in this plan.');
      return;
    }
    addPerson(plan.id, name);
    setNewPersonName('');
    setAddError('');
  };

  const openEdit = () => {
    setEditName(plan.name);
    setEditStart(plan.startDate);
    setEditEnd(plan.endDate);
    setEditError('');
    setEditOpen(true);
  };

  const commitEdit = () => {
    if (!editName.trim()) { setEditError('Enter a plan name.'); return; }
    if (!editStart || !editEnd) { setEditError('Both dates required.'); return; }
    if (editEnd < editStart) { setEditError('End date must be after start date.'); return; }
    updatePlan(plan.id, { name: editName.trim(), startDate: editStart, endDate: editEnd });
    setEditOpen(false);
  };

  const handleDelete = () => {
    deletePlan(plan.id);
    navigate('/');
  };

  // Compute available dates (everyone included is ✅)
  const availableDates = dates.filter(date => {
    const included = plan.people.filter(p => !excludedSet.has(p.id));
    if (included.length === 0) return false;
    return included.every(p => (p.availability[date] ?? 'blank') === 'available');
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-full flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm mr-1"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Plans</span>
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-gray-900 truncate">{plan.name}</h2>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CalendarRange size={12} className="text-gray-400" />
              <span>{formatDateRange(plan.startDate, plan.endDate)}</span>
              <span className="text-gray-300">·</span>
              <span>{dates.length} days</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-red-600">Delete plan?</span>
                <button
                  onClick={handleDelete}
                  className="px-2 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Grid area */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
          {/* Add Person */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add person…"
                value={newPersonName}
                onChange={e => { setNewPersonName(e.target.value); setAddError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition-colors w-44"
              />
              <button
                onClick={handleAddPerson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
              >
                <UserPlus size={14} /> Add
              </button>
            </div>
            {addError && <span className="text-red-500 text-sm">{addError}</span>}
            {plan.people.length === 0 && !addError && (
              <span className="text-gray-400 text-sm">Start by adding people to this plan</span>
            )}
          </div>

          {/* Grid */}
          {plan.people.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <UserPlus size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">No people yet</p>
                <p className="text-sm text-gray-400">Add people above to start filling in availability</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <AvailabilityGrid
                planId={plan.id}
                people={plan.people}
                dates={dates}
                excludedPeople={plan.excludedPeople}
              />
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-56 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
          {/* Filter panel */}
          <div className="border-b border-gray-100">
            <button
              onClick={() => setFilterOpen(f => !f)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="uppercase tracking-wide text-xs text-gray-500">People Filter</span>
              {filterOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {filterOpen && (
              <div className="px-4 pb-4 space-y-2">
                {plan.people.length === 0 ? (
                  <p className="text-xs text-gray-400">No people added yet</p>
                ) : (
                  plan.people.map(person => {
                    const isExcluded = excludedSet.has(person.id);
                    return (
                      <label
                        key={person.id}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <div
                          onClick={() => togglePersonExclusion(plan.id, person.id)}
                          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                            !isExcluded
                              ? 'bg-gray-900 border-gray-900'
                              : 'bg-white border-gray-300 group-hover:border-gray-400'
                          }`}
                        >
                          {!isExcluded && <Check size={10} className="text-white stroke-[3]" />}
                        </div>
                        <span
                          className={`text-sm transition-colors ${
                            isExcluded ? 'text-gray-300 line-through' : 'text-gray-700'
                          }`}
                        >
                          {person.name}
                        </span>
                      </label>
                    );
                  })
                )}
                {plan.people.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Uncheck to exclude from the summary calculation
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Available dates summary */}
          <div className="flex-1 px-4 py-4">
            <p className="uppercase tracking-wide text-xs text-gray-500 mb-3">Available Dates</p>
            {plan.people.length === 0 ? (
              <p className="text-xs text-gray-400">Add people to see availability</p>
            ) : availableDates.length === 0 ? (
              <div>
                <p className="text-xs text-gray-400 mb-1">No dates work for everyone yet.</p>
                <p className="text-xs text-gray-300">Fill in availability or adjust filters</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {availableDates.map(date => (
                  <div
                    key={date}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-green-50 border border-green-100 rounded-lg"
                  >
                    <Check size={12} className="text-green-600 flex-shrink-0 stroke-[2.5]" />
                    <span className="text-sm text-green-800">
                      {format(parseISO(date), 'EEE, MMM d')}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">
                  {availableDates.length} of {dates.length} dates work
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="border-t border-gray-100 px-4 py-4">
            <p className="uppercase tracking-wide text-xs text-gray-400 mb-2">Legend</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                  <Check size={11} className="text-green-700 stroke-[2.5]" />
                </div>
                <span className="text-xs text-gray-500">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-100 rounded flex items-center justify-center">
                  <X size={11} className="text-red-600 stroke-[2.5]" />
                </div>
                <span className="text-xs text-gray-500">Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-50 rounded border border-gray-200" />
                <span className="text-xs text-gray-500">Not set</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Click a cell to cycle states. Drag across cells to multi-select.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Plan Modal */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-gray-900 mb-5">Edit Plan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Plan Name</label>
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={e => { setEditName(e.target.value); setEditError(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={e => { setEditStart(e.target.value); setEditError(''); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={e => { setEditEnd(e.target.value); setEditError(''); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              {editError && <p className="text-red-500 text-sm">{editError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={commitEdit}
                className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
