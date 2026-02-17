
import { Employee, ShiftRecord, VacationRequest, Role, Department, StaffStatus } from '../types';

const DB_NAME = 'ILPI_DATABASE';
const CURRENT_VERSION = 2;

export interface DatabaseSchema {
  version: number;
  employees: Employee[];
  shifts: ShiftRecord[];
  vacations: VacationRequest[];
  lastUpdate: string;
}

const INITIAL_DATA: Omit<DatabaseSchema, 'version' | 'lastUpdate'> = {
  employees: [
    { 
      id: '1', 
      firstName: 'Juan', 
      lastName: 'García', 
      email: 'juan@ilpi.es', 
      phone: '600112233', 
      dni: '12345678X',
      address: 'Calle Mayor 12, Villa Joyosa',
      birthDate: '1985-05-20',
      maritalStatus: 'Casado/a',
      gender: 'Masculino',
      role: Role.ADMIN, 
      department: Department.MANAGEMENT, 
      status: StaffStatus.ACTIVE, 
      hireDate: '2022-01-15', 
      profileImage: 'https://picsum.photos/seed/juan/100' 
    }
  ],
  shifts: [],
  vacations: []
};

export const database = {
  load(): DatabaseSchema {
    const stored = localStorage.getItem(DB_NAME);
    if (!stored) {
      return this.save(INITIAL_DATA);
    }
    return JSON.parse(stored);
  },

  save(data: Partial<DatabaseSchema>): DatabaseSchema {
    const current = this.load();
    const newData: DatabaseSchema = {
      ...current,
      ...data,
      version: CURRENT_VERSION,
      lastUpdate: new Date().toISOString()
    };
    localStorage.setItem(DB_NAME, JSON.stringify(newData));
    return newData;
  },

  clear() {
    localStorage.removeItem(DB_NAME);
    return this.load();
  }
};
