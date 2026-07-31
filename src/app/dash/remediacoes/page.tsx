import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { RemediationsScreen } from '@/components/dash/RemediationsScreen';

export default function Page() {
  return (
    <DataScreenGate>
      <RemediationsScreen />
    </DataScreenGate>
  );
}
