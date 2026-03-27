import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { Plus, CalendarRange, Pencil, Trash2, Check, X, Users, ChevronRight, Calendar } from 'lucide-react';
import { usePlans, Plan } from '../context/PlansContext';
import { DateRangePicker } from '../components/DateRangePicker';

function formatDateRange(startDate: string, endDate: string) {
  try {
    const s = parseISO(startDate);
    const e = parseISO(endDate);
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

function dayCount(startDate: string, endDate: string) {
  try {
    return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).length;
  } catch {
    return 0;
  }
}

interface PlanCardProps {
  plan: Plan;
  onOpen: () => void;
  onDelete: () => void;
}

function PlanCard({ plan, onOpen, onDelete }: PlanCardProps) {
  const { updatePlan } = usePlans();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(plan.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const commitRename = () => {
    if (renameValue.trim()) updatePlan(plan.id, { name: renameValue.trim() });
    else setRenameValue(plan.name);
    setRenaming(false);
  };

  const days = dayCount(plan.startDate, plan.endDate);

  return (
    <div
      className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => {
        if (!renaming && !confirmDelete) onOpen();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div
              className="flex items-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') {
                    setRenameValue(plan.name);
                    setRenaming(false);
                  }
                }}
                className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 bg-blue-50"
              />
              <button
                onClick={commitRename}
                className="text-green-600 hover:text-green-700 transition-colors"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setRenameValue(plan.name);
                  setRenaming(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <h3 className="text-gray-900 truncate">{plan.name}</h3>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CalendarRange size={13} className="text-gray-400" />
              <span>{formatDateRange(plan.startDate, plan.endDate)}</span>
            </div>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">{days} days</span>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <Users size={13} className="text-gray-400" />
            <span className="text-sm text-gray-500">
              {plan.people.length === 0
                ? 'No people yet'
                : `${plan.people.length} ${plan.people.length === 1 ? 'person' : 'people'}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!renaming && !confirmDelete && (
            <>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setRenameValue(plan.name);
                  setRenaming(true);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                title="Rename"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
              <ChevronRight size={16} className="text-gray-300 ml-1" />
            </>
          )}

          {confirmDelete && (
            <div
              className="flex items-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <span className="text-sm text-red-600">Delete?</span>
              <button
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                className="px-2 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlansScreen() {
  const navigate = useNavigate();
  const { plans, createPlan, deletePlan } = usePlans();

  const [planName, setPlanName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleCreate = () => {
    if (!planName.trim()) { setError('Enter a plan name.'); return; }
    if (!startDate) { setError('Choose a start date.'); return; }
    if (!endDate) { setError('Choose an end date.'); return; }
    if (endDate < startDate) { setError('End date must be after start date.'); return; }
    createPlan(planName.trim(), startDate, endDate);
    setPlanName('');
    setStartDate('');
    setEndDate('');
    setError('');
  };

  const formatDisplay = (dateStr: string) =>
    dateStr ? format(parseISO(dateStr), 'MMM d, yyyy') : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-gray-900">Shein Availability Checker</h1>
          <p className="text-gray-500 mt-1">Plan dates with friends and instantly find matches</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Create Plan */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-gray-800 mb-4">Create a Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-1">
              <label className="block text-sm text-gray-600 mb-1">Plan Name</label>
              <input
                type="text"
                placeholder="e.g. Summer Trip"
                value={planName}
                onChange={e => { setPlanName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-colors"
              />
            </div>
            {/* Date range trigger — spans 2 cols */}
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Date Range</label>
              <button
                type="button"
                onClick={() => { setPickerOpen(true); setError(''); }}
                className={`w-full flex items-center gap-2.5 border rounded-lg px-3 py-2 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 ${
                  startDate || endDate
                    ? 'border-indigo-200 bg-indigo-50 text-gray-800'
                    : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-gray-100'
                }`}
              >
                <Calendar size={14} className={startDate || endDate ? 'text-indigo-500' : 'text-gray-400'} />
                {startDate && endDate ? (
                  <span className="text-gray-800">
                    {formatDisplay(startDate)}
                    <span className="mx-1.5 text-gray-400">→</span>
                    {formatDisplay(endDate)}
                  </span>
                ) : startDate ? (
                  <span className="text-gray-600">
                    {formatDisplay(startDate)}
                    <span className="ml-2 text-gray-400 italic text-xs">pick end date…</span>
                  </span>
                ) : (
                  <span>Select start & end dates</span>
                )}
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setStartDate(''); setEndDate(''); }}
                    className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus size={15} />
            Create Plan
          </button>
        </div>

        {/* Plans List */}
        <div>
          <h2 className="text-gray-800 mb-4">
            {plans.length === 0 ? 'Plans' : `Plans (${plans.length})`}
          </h2>

          {plans.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
              <CalendarRange size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">No plans yet</p>
              <p className="text-sm text-gray-400">Create your first plan above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onOpen={() => navigate(`/plan/${plan.id}`)}
                  onDelete={() => deletePlan(plan.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Range Picker Modal */}
      {pickerOpen && (
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}