/**
 * Employee Time Tracking View for Feature 005: US4 Clock In/Out
 *
 * Allows employees to:
 * - Clock in/out for their shift
 * - View time tracking records
 */

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Card } from '../components/ui';
import TimeClock from '../components/time-tracking/TimeClock';

export default function EmployeeTimeTracking() {
  const [, setRefreshTrigger] = useState(0);

  const handleStatusUpdate = () => {
    // Trigger re-fetch of time status when clock in/out completes
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Control de Fichaje</h1>
          <p className="text-gray-600">Registra tu entrada y salida del trabajo</p>
        </div>
      </div>

      {/* Clock In/Out Widget */}
      <Card className="p-8">
        <div className="flex justify-center">
          <TimeClock onStatusChange={() => handleStatusUpdate()} />
        </div>
      </Card>

      {/* Time Records Section */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Historial de Fichajes</h2>
        <p className="text-gray-600">
          Los registros de fichaje se mostrarán aquí una vez implementado el historial completo.
        </p>
      </Card>
    </div>
  );
}
