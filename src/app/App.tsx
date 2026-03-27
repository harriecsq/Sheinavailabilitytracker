import { RouterProvider } from 'react-router';
import { PlansProvider } from './context/PlansContext';
import { router } from './routes';

export default function App() {
  return (
    <PlansProvider>
      <RouterProvider router={router} />
    </PlansProvider>
  );
}
