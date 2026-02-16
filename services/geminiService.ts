
import { GoogleGenAI, Type } from "@google/genai";
import { Employee, ShiftRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getShiftInsights = async (employees: Employee[], shifts: ShiftRecord[]) => {
  const prompt = `Analiza los siguientes datos de empleados y turnos del restaurante ILPI en Villa Joyosa. 
  Proporciona un resumen ejecutivo breve sobre la productividad y posibles conflictos de horario o sugerencias de optimización para los equipos de cocina y sala.
  
  Empleados: ${JSON.stringify(employees)}
  Turnos Recientes: ${JSON.stringify(shifts)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Eres un consultor experto en RRHH para hostelería española. Tu tono es profesional, analítico y constructivo."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching insights:", error);
    return "No se pudieron generar los insights en este momento.";
  }
};

export const generateRotarySuggestion = async (department: string, employees: Employee[]) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Genera una propuesta de rotación (Rotary) para el departamento de ${department}. Considera que el restaurante está en Alicante y hay picos de fines de semana. Personal disponible: ${JSON.stringify(employees.filter(e => e.department === department))}`,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                proposal: { type: Type.STRING },
                efficiencyScore: { type: Type.NUMBER }
            }
        }
    }
  });
  return JSON.parse(response.text);
};
