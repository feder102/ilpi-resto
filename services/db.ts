
import { Employee, ShiftRecord, VacationRequest, Role, Department, StaffStatus } from '../types';

const DB_NAME = 'ILPI_DATABASE';
const CURRENT_VERSION = 2; // Incrementar esto cuando cambies el esquema

interface DatabaseSchema {
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
    },
    { 
      id: '2', 
      firstName: 'Elena', 
      lastName: 'Rodríguez', 
      email: 'elena@ilpi.es', 
      phone: '611223344', 
      dni: '87654321Y',
      address: 'Av. Mediterraneo 5, Benidorm',
      birthDate: '1992-11-03',
      maritalStatus: 'Soltero/a',
      gender: 'Femenino',
      role: Role.MODERATOR, 
      department: Department.KITCHEN, 
      status: StaffStatus.ACTIVE, 
      hireDate: '2023-03-10', 
      profileImage: 'https://picsum.photos/seed/elena/100' 
    }
  ],
  shifts: [],
  vacations: []
};

export const db = {
  // Inicializa la DB o aplica migraciones si la versión cambia
  init(): DatabaseSchema {
    const stored = localStorage.getItem(DB_NAME);
    if (!stored) {
      return this.saveAll(INITIAL_DATA);
    }

    const data: DatabaseSchema = JSON.parse(stored);

    // Lógica de Migración Simple
    if (data.version < CURRENT_VERSION) {
      console.log(`Migrando base de datos de v${data.version} a v${CURRENT_VERSION}`);
      // Aquí podrías transformar los datos si el esquema cambió
      data.version = CURRENT_VERSION;
      return this.saveAll(data);
    }

    return data;
  },

  saveAll(data: Partial<DatabaseSchema>): DatabaseSchema {
    const current = this.getAll();
    const newData: DatabaseSchema = {
      ...current,
      ...data,
      version: CURRENT_VERSION,
      lastUpdate: new Date().toISOString()
    };
    localStorage.setItem(DB_NAME, JSON.stringify(newData));
    return newData;
  },

  getAll(): DatabaseSchema {
    const stored = localStorage.getItem(DB_NAME);
    return stored ? JSON.parse(stored) : { version: CURRENT_VERSION, employees: [], shifts: [], vacations: [], lastUpdate: '' };
  },

  reset() {
    localStorage.removeItem(DB_NAME);
    return this.init();
  },

  exportJSON() {
    const data = this.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ilpi_db_v${data.version}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  },

  importJSON(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);
      if (data.employees && Array.isArray(data.employees)) {
        this.saveAll(data);
        window.location.reload();
      }
    } catch (e) {
      alert("Error al importar el archivo JSON. Formato inválido.");
    }
  }
};
