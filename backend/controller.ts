
import { database, DatabaseSchema } from './db';
import { Employee, ShiftRecord, VacationRequest } from '../types';

// Simulamos latencia de red para que el frontend se comporte de forma realista
const networkDelay = () => new Promise(resolve => setTimeout(resolve, 300));

export const serverController = {
  async getInitialData(): Promise<DatabaseSchema> {
    await networkDelay();
    return database.load();
  },

  async updateEmployees(employees: Employee[]): Promise<Employee[]> {
    await networkDelay();
    database.save({ employees });
    return employees;
  },

  async updateShifts(shifts: ShiftRecord[]): Promise<ShiftRecord[]> {
    await networkDelay();
    database.save({ shifts });
    return shifts;
  },

  async updateVacations(vacations: VacationRequest[]): Promise<VacationRequest[]> {
    await networkDelay();
    database.save({ vacations });
    return vacations;
  },

  async resetSystem(): Promise<DatabaseSchema> {
    await networkDelay();
    return database.clear();
  },

  async importDatabase(data: any): Promise<DatabaseSchema> {
    await networkDelay();
    return database.save(data);
  }
};
