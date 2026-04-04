export interface SportConfig {
  sport_key: string;
  display_name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  has_distance: boolean;
  has_power: boolean;
  has_pace: boolean;
  has_zones: boolean;
  zone_model: 'hr' | 'power' | 'pace' | null;
  dedicated_page: boolean;
  distance_unit: string | null;
  pace_unit: string | null;
}

export type SportPreset = 'triathlon' | 'runner' | 'cyclist' | 'custom';
