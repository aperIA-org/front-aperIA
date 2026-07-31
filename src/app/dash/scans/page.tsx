import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { ScansScreen } from '@/components/dash/ScansScreen';

export default function Page() {
  return (
    <DataScreenGate>
      <ScansScreen />
    </DataScreenGate>
  );
}
