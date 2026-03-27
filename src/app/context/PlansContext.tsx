import React, { createContext, useContext, useState } from 'react';

export type CellState = 'blank' | 'available' | 'unavailable';

export interface Person {
  id: string;
  name: string;
  availability: Record<string, CellState>;
  note: string;
}

export interface Plan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  people: Person[];
  excludedPeople: string[];
}

interface PlansContextType {
  plans: Plan[];
  createPlan: (name: string, startDate: string, endDate: string) => void;
  deletePlan: (id: string) => void;
  updatePlan: (id: string, updates: Partial<Pick<Plan, 'name' | 'startDate' | 'endDate'>>) => void;
  addPerson: (planId: string, name: string) => void;
  removePerson: (planId: string, personId: string) => void;
  updateCellState: (planId: string, personId: string, date: string, state: CellState) => void;
  updatePersonNote: (planId: string, personId: string, note: string) => void;
  togglePersonExclusion: (planId: string, personId: string) => void;
  bulkUpdateCells: (planId: string, cells: Array<{ personId: string; date: string }>, state: CellState | 'blank') => void;
}

const PlansContext = createContext<PlansContextType | null>(null);

function genId() {
  return Math.random().toString(36).substring(2, 10);
}

const INITIAL_PLANS: Plan[] = [];

export function PlansProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>(INITIAL_PLANS);

  const createPlan = (name: string, startDate: string, endDate: string) => {
    const newPlan: Plan = {
      id: genId(),
      name,
      startDate,
      endDate,
      people: [],
      excludedPeople: [],
    };
    setPlans(prev => [...prev, newPlan]);
  };

  const deletePlan = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const updatePlan = (id: string, updates: Partial<Pick<Plan, 'name' | 'startDate' | 'endDate'>>) => {
    setPlans(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const addPerson = (planId: string, name: string) => {
    setPlans(prev =>
      prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          people: [...p.people, { id: genId(), name, availability: {}, note: '' }],
        };
      })
    );
  };

  const removePerson = (planId: string, personId: string) => {
    setPlans(prev =>
      prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          people: p.people.filter(person => person.id !== personId),
          excludedPeople: p.excludedPeople.filter(id => id !== personId),
        };
      })
    );
  };

  const updateCellState = (planId: string, personId: string, date: string, state: CellState) => {
    setPlans(prev =>
      prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          people: p.people.map(person => {
            if (person.id !== personId) return person;
            return {
              ...person,
              availability: { ...person.availability, [date]: state },
            };
          }),
        };
      })
    );
  };

  const updatePersonNote = (planId: string, personId: string, note: string) => {
    setPlans(prev =>
      prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          people: p.people.map(person => (person.id !== personId ? person : { ...person, note })),
        };
      })
    );
  };

  const togglePersonExclusion = (planId: string, personId: string) => {
    setPlans(prev =>
      prev.map(p => {
        if (p.id !== planId) return p;
        const isExcluded = p.excludedPeople.includes(personId);
        return {
          ...p,
          excludedPeople: isExcluded
            ? p.excludedPeople.filter(id => id !== personId)
            : [...p.excludedPeople, personId],
        };
      })
    );
  };

  const bulkUpdateCells = (
    planId: string,
    cells: Array<{ personId: string; date: string }>,
    state: CellState | 'blank'
  ) => {
    const cellState: CellState = state === 'blank' ? 'blank' : state;
    setPlans(prev =>
      prev.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          people: p.people.map(person => {
            const relevant = cells.filter(c => c.personId === person.id);
            if (relevant.length === 0) return person;
            const newAvailability = { ...person.availability };
            relevant.forEach(c => {
              newAvailability[c.date] = cellState;
            });
            return { ...person, availability: newAvailability };
          }),
        };
      })
    );
  };

  return (
    <PlansContext.Provider
      value={{
        plans,
        createPlan,
        deletePlan,
        updatePlan,
        addPerson,
        removePerson,
        updateCellState,
        updatePersonNote,
        togglePersonExclusion,
        bulkUpdateCells,
      }}
    >
      {children}
    </PlansContext.Provider>
  );
}

export function usePlans() {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlans must be used within PlansProvider');
  return ctx;
}