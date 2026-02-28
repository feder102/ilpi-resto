/**
 * T058: Team Types with Shift Type Integration
 */

import { ShiftType } from './shift-types';

export interface Team {
  id: string; // UUID
  name: string;
  department: string;
  shift_type_id: string; // FK to ShiftType
  shift_type?: ShiftType; // Full shift type details
  time_windows?: Array<{ start: string; end: string }>;
  total_hours?: number;
  expected_hours?: number;
  uses_dynamic_close?: boolean;
  is_active: boolean;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string; // UUID
  first_name: string;
  last_name: string;
  profile_image?: string;
}

export interface TeamCreate {
  name: string;
  department: string;
  shift_type_id: string; // UUID reference to ShiftType
}

export interface TeamUpdate {
  name?: string;
  department?: string;
  shift_type_id?: string;
}

export interface TeamResponse {
  id: string;
  name: string;
  department: string;
  shift_type_id: string;
  shift_type?: ShiftType;
  time_windows?: Array<{ start: string; end: string }>;
  total_hours?: number;
  expected_hours?: number;
  uses_dynamic_close?: boolean;
  is_active: boolean;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedTeams {
  items: TeamResponse[];
  total: number;
  page: number;
  pages: number;
  size: number;
}
