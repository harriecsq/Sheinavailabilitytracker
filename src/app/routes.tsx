import { createBrowserRouter } from 'react-router';
import { PlansScreen } from './pages/PlansScreen';
import { PlanCalendarScreen } from './pages/PlanCalendarScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: PlansScreen,
  },
  {
    path: '/plan/:planId',
    Component: PlanCalendarScreen,
  },
]);
