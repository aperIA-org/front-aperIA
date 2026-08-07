import { AttackEmulationScreen } from '@/components/dash/AttackEmulationScreen';
import { DataScreenGate } from '@/components/dash/DataScreenGate';

export default function Page() {
  return (
    <DataScreenGate>
      <AttackEmulationScreen />
    </DataScreenGate>
  );
}
