import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../supabase';

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
  createPlan: (name: string, startDate: string, endDate: string) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  updatePlan: (
    id: string,
    updates: Partial<Pick<Plan, 'name' | 'startDate' | 'endDate'>>
  ) => Promise<void>;
  addPerson: (planId: string, name: string) => Promise<void>;
  renamePerson: (planId: string, personId: string, name: string) => Promise<boolean>;
  removePerson: (planId: string, personId: string) => Promise<void>;
  updateCellState: (
    planId: string,
    personId: string,
    date: string,
    state: CellState
  ) => Promise<void>;
  updatePersonNote: (planId: string, personId: string, note: string) => Promise<void>;
  togglePersonExclusion: (planId: string, personId: string) => Promise<void>;
  bulkUpdateCells: (
    planId: string,
    cells: Array<{ personId: string; date: string }>,
    state: CellState | 'blank'
  ) => Promise<void>;
}

const PlansContext = createContext<PlansContextType | null>(null);

const INITIAL_PLANS: Plan[] = [];

type PlanRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  excluded_people?: string[] | null;
};

type PersonRow = {
  id: string;
  plan_id: string;
  name: string;
  note?: string | null;
};

type AvailabilityRow = {
  id?: string;
  plan_id?: string;
  person_id: string;
  date: string;
  state: CellState;
};

export function PlansProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>(INITIAL_PLANS);

const loadPlans = async () => {
  const [
    { data: plansData, error: plansError },
    { data: peopleData, error: peopleError },
    { data: availabilityData, error: availabilityError },
  ] = await Promise.all([
    supabase.from('plans').select('*').order('created_at', { ascending: true }),
    supabase.from('people').select('*').order('created_at', { ascending: true }),
    supabase.from('availability').select('*'),
  ]);

  if (plansError) {
    console.error('Failed to load plans:', plansError);
    return;
  }

  if (peopleError) {
    console.error('Failed to load people:', peopleError);
    return;
  }

  if (availabilityError) {
    console.error('Failed to load availability:', availabilityError);
    return;
  }

  const personMap = new Map<string, Person>();
  const peopleByPlan = new Map<string, Person[]>();

  ((peopleData as PersonRow[] | null) ?? []).forEach((personRow) => {
    const person: Person = {
      id: personRow.id,
      name: personRow.name,
      availability: {},
      note: personRow.note ?? '',
    };

    personMap.set(person.id, person);

    const existing = peopleByPlan.get(personRow.plan_id) ?? [];
    existing.push(person);
    peopleByPlan.set(personRow.plan_id, existing);
  });

  ((availabilityData as AvailabilityRow[] | null) ?? []).forEach((row) => {
    const person = personMap.get(row.person_id);
    if (!person) return;
    person.availability[row.date] = row.state;
  });

  const mappedPlans: Plan[] = ((plansData as PlanRow[] | null) ?? []).map((planRow) => ({
    id: planRow.id,
    name: planRow.name,
    startDate: planRow.start_date,
    endDate: planRow.end_date,
    people: peopleByPlan.get(planRow.id) ?? [],
    excludedPeople: Array.isArray(planRow.excluded_people) ? planRow.excluded_people : [],
  }));

  setPlans(mappedPlans);
};

  useEffect(() => {
    void loadPlans();
  }, []);

  const createPlan = async (name: string, startDate: string, endDate: string) => {
    const { error } = await supabase.from('plans').insert([
      {
        name,
        start_date: startDate,
        end_date: endDate,
      },
    ]);

    if (error) {
      console.error('Failed to create plan:', error);
      return;
    }

    await loadPlans();
  };

  const deletePlan = async (id: string) => {
    const { data: peopleRows, error: peopleLookupError } = await supabase
      .from('people')
      .select('id')
      .eq('plan_id', id);

    if (peopleLookupError) {
      console.error('Failed to find people for plan deletion:', peopleLookupError);
      return;
    }

    const personIds = (peopleRows ?? []).map((row: { id: string }) => row.id);

    if (personIds.length > 0) {
      const { error: availabilityDeleteError } = await supabase
        .from('availability')
        .delete()
        .in('person_id', personIds);

      if (availabilityDeleteError) {
        console.error('Failed to delete availability rows:', availabilityDeleteError);
        return;
      }
    }

    const { error: peopleDeleteError } = await supabase
      .from('people')
      .delete()
      .eq('plan_id', id);

    if (peopleDeleteError) {
      console.error('Failed to delete people:', peopleDeleteError);
      return;
    }

    const { error: planDeleteError } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (planDeleteError) {
      console.error('Failed to delete plan:', planDeleteError);
      return;
    }

    await loadPlans();
  };

  const updatePlan = async (
    id: string,
    updates: Partial<Pick<Plan, 'name' | 'startDate' | 'endDate'>>
  ) => {
    const dbUpdates: Record<string, string> = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;

    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase.from('plans').update(dbUpdates).eq('id', id);

    if (error) {
      console.error('Failed to update plan:', error);
      return;
    }

    await loadPlans();
  };

  const addPerson = async (planId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { error } = await supabase.from('people').insert([
      {
        plan_id: planId,
        name: trimmed,
        note: '',
      },
    ]);

    if (error) {
      console.error('Failed to add person:', error);
      return;
    }

    await loadPlans();
  };

  const renamePerson = async (planId: string, personId: string, name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return false;

  const { error } = await supabase
    .from('people')
    .update({ name: trimmed })
    .eq('id', personId);

  if (error) {
    console.error('Failed to rename person:', error);
    return false;
  }

  await loadPlans();
  return true;
};

  const removePerson = async (planId: string, personId: string) => {
    const currentPlan = plans.find((p) => p.id === planId);
    const newExcludedPeople = (currentPlan?.excludedPeople ?? []).filter((id) => id !== personId);

    const { error: availabilityDeleteError } = await supabase
      .from('availability')
      .delete()
      .eq('person_id', personId);

    if (availabilityDeleteError) {
      console.error('Failed to delete person availability:', availabilityDeleteError);
      return;
    }

    const { error: personDeleteError } = await supabase
      .from('people')
      .delete()
      .eq('id', personId);

    if (personDeleteError) {
      console.error('Failed to delete person:', personDeleteError);
      return;
    }

    const { error: planUpdateError } = await supabase
      .from('plans')
      .update({ excluded_people: newExcludedPeople })
      .eq('id', planId);

    if (planUpdateError) {
      console.error('Failed to clean excluded people list:', planUpdateError);
      return;
    }

    await loadPlans();
  };

  const updateCellState = async (
    planId: string,
    personId: string,
    date: string,
    state: CellState
  ) => {
    if (state === 'blank') {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('person_id', personId)
        .eq('date', date);

      if (error) {
        console.error('Failed to clear availability cell:', error);
        return;
      }

      await loadPlans();
      return;
    }

    const { error } = await supabase.from('availability').upsert(
      [
        {
          plan_id: planId,
          person_id: personId,
          date,
          state,
        },
      ],
      { onConflict: 'person_id,date' }
    );

    if (error) {
      console.error('Failed to update availability cell:', error);
      return;
    }

    await loadPlans();
  };

  const updatePersonNote = async (planId: string, personId: string, note: string) => {
    const { error } = await supabase
      .from('people')
      .update({ note })
      .eq('id', personId)
      .eq('plan_id', planId);

    if (error) {
      console.error('Failed to update note:', error);
      return;
    }

    await loadPlans();
  };

  const togglePersonExclusion = async (planId: string, personId: string) => {
    const currentPlan = plans.find((p) => p.id === planId);
    if (!currentPlan) return;

    const isExcluded = currentPlan.excludedPeople.includes(personId);

    const updatedExcludedPeople = isExcluded
      ? currentPlan.excludedPeople.filter((id) => id !== personId)
      : [...currentPlan.excludedPeople, personId];

    const { error } = await supabase
      .from('plans')
      .update({ excluded_people: updatedExcludedPeople })
      .eq('id', planId);

    if (error) {
      console.error('Failed to toggle exclusion:', error);
      return;
    }

    await loadPlans();
  };

  const bulkUpdateCells = async (
    planId: string,
    cells: Array<{ personId: string; date: string }>,
    state: CellState | 'blank'
  ) => {
    if (cells.length === 0) return;

    if (state === 'blank') {
      for (const cell of cells) {
        const { error } = await supabase
          .from('availability')
          .delete()
          .eq('person_id', cell.personId)
          .eq('date', cell.date);

        if (error) {
          console.error('Failed to clear bulk availability cells:', error);
          return;
        }
      }

      await loadPlans();
      return;
    }

    const rows = cells.map((cell) => ({
      plan_id: planId,
      person_id: cell.personId,
      date: cell.date,
      state,
    }));

    const { error } = await supabase
      .from('availability')
      .upsert(rows, { onConflict: 'person_id,date' });

    if (error) {
      console.error('Failed to bulk update availability cells:', error);
      return;
    }

    await loadPlans();
  };

  return (
    <PlansContext.Provider
      value={{
        plans,
        createPlan,
        deletePlan,
        updatePlan,
        addPerson,
        renamePerson,
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