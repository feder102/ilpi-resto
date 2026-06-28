/**
 * Types representing the documentation structures.
 *
 * Espejo de los tipos del proyecto `template-documentacion`
 * (https://github.com/feder102/template-documentacion).
 * Se incluye aquí para que `data.ts` sea autovalidable y se pueda copiar
 * directamente dentro de ese proyecto separado (carpeta `src/`).
 */

export type Category = 'db' | 'frontend' | 'backend';

export interface CodeSnippet {
  language: string;
  code: string;
  filename?: string;
}

export interface DocSection {
  type: 'paragraph' | 'code' | 'list' | 'info-box' | 'architecture-step';
  title?: string;
  content: string | string[]; // string for paragraph/code, array for list
  snippet?: CodeSnippet;
  badge?: string;
}

export interface DocArticle {
  id: string;
  title: string;
  category: Category;
  summary: string;
  iconName: string; // Lucide icon identifier
  tags: string[];
  sections: DocSection[];
  lastUpdated: string;
  author: string;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}

export interface CategoryInfo {
  id: Category;
  title: string;
  description: string;
  iconName: string;
  colorClass: string;
  badgeColor: string;
}
