
import { serverController } from '../backend/controller';
import { Employee, ShiftRecord, VacationRequest } from '../types';

/**
 * Servicio de API de ILPI
 * Esta capa abstrae la comunicación con el backend.
 * Si en el futuro cambias a un backend real (REST/GraphQL),
 * solo necesitas modificar estas funciones para usar 'fetch'.
 */
export const ilpiApi = {
  async fetchAllData() {
    return await serverController.getInitialData();
  },

  async syncEmployees(employees: Employee[]) {
    return await serverController.updateEmployees(employees);
  },

  async syncShifts(shifts: ShiftRecord[]) {
    return await serverController.updateShifts(shifts);
  },

  async syncVacations(vacations: VacationRequest[]) {
    return await serverController.updateVacations(vacations);
  },

  async resetSystem() {
    return await serverController.resetSystem();
  },

  async importData(json: string) {
    const data = JSON.parse(json);
    return await serverController.importDatabase(data);
  }
};
