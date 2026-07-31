import { Suspense } from 'react';
import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { FindingsScreen } from '@/components/dash/FindingsScreen';

export default function FindingsPage() {
  return (
    <DataScreenGate>
      {/* FindingsScreen usa useSearchParams (os filtros vivem na URL). */}
      <Suspense fallback={null}>
        <FindingsScreen />
      </Suspense>
    </DataScreenGate>
  );
}
