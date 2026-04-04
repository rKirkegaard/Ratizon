export const TRIATHLON_SPORTS = [
  { sport_key: 'swim', display_name: 'Svømning', color: '#3c82f6', icon: 'waves', sort_order: 1, has_distance: true, has_power: false, has_pace: true, has_zones: true, zone_model: 'pace', dedicated_page: true, distance_unit: 'm', pace_unit: '/100m' },
  { sport_key: 'bike', display_name: 'Cykling', color: '#4ec65e', icon: 'bike', sort_order: 2, has_distance: true, has_power: true, has_pace: false, has_zones: true, zone_model: 'power', dedicated_page: true, distance_unit: 'km', pace_unit: null },
  { sport_key: 'run', display_name: 'Løb', color: '#f97429', icon: 'footprints', sort_order: 3, has_distance: true, has_power: false, has_pace: true, has_zones: true, zone_model: 'hr', dedicated_page: true, distance_unit: 'km', pace_unit: '/km' },
  { sport_key: 'strength', display_name: 'Styrke', color: '#a855f7', icon: 'dumbbell', sort_order: 4, has_distance: false, has_power: false, has_pace: false, has_zones: false, zone_model: null, dedicated_page: true, distance_unit: null, pace_unit: null },
];

export const RUNNER_SPORTS = [
  { sport_key: 'run', display_name: 'Løb', color: '#f97429', icon: 'footprints', sort_order: 1, has_distance: true, has_power: false, has_pace: true, has_zones: true, zone_model: 'hr', dedicated_page: true, distance_unit: 'km', pace_unit: '/km' },
  { sport_key: 'strength', display_name: 'Styrke', color: '#a855f7', icon: 'dumbbell', sort_order: 2, has_distance: false, has_power: false, has_pace: false, has_zones: false, zone_model: null, dedicated_page: true, distance_unit: null, pace_unit: null },
];

export const CYCLIST_SPORTS = [
  { sport_key: 'bike', display_name: 'Cykling', color: '#4ec65e', icon: 'bike', sort_order: 1, has_distance: true, has_power: true, has_pace: false, has_zones: true, zone_model: 'power', dedicated_page: true, distance_unit: 'km', pace_unit: null },
  { sport_key: 'strength', display_name: 'Styrke', color: '#a855f7', icon: 'dumbbell', sort_order: 2, has_distance: false, has_power: false, has_pace: false, has_zones: false, zone_model: null, dedicated_page: true, distance_unit: null, pace_unit: null },
];

// Generic sport template for custom sports
export const GENERIC_SPORT = {
  has_distance: true, has_power: false, has_pace: false, has_zones: true, zone_model: 'hr',
  dedicated_page: false, distance_unit: 'km', pace_unit: null,
};
