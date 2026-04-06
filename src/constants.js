export const DAYS = [
  { key: 'mon', s: 'Pon', full: 'Poniedziałek' },
  { key: 'tue', s: 'Wt',  full: 'Wtorek'       },
  { key: 'wed', s: 'Śr',  full: 'Środa'         },
  { key: 'thu', s: 'Czw', full: 'Czwartek'      },
  { key: 'fri', s: 'Pt',  full: 'Piątek'        },
  { key: 'sat', s: 'Sob', full: 'Sobota'        },
  { key: 'sun', s: 'Nd',  full: 'Niedziela'     },
]

export const UNITS = [
  'km', 'm', 'min', 'sek', 'h', 'min/km', 'km/h',
  'kg', 'lbs', 'reps', 'serie', '%', '% 1RM', 'RPE',
  'kcal', 'W', 'bpm', 'x',
]

export const LOAD_UNITS = ['kg', 'lbs', '% 1RM', '%', 'RPE', 'N/A']

export const DEFAULT_DISCIPLINES = [
  {
    id: 'run', name: 'Bieganie', icon: '🏃', color: '#a3e635', hasEx: false,
    dp: [
      { key: 'Dystans',  value: '', unit: 'km'     },
      { key: 'Czas',     value: '', unit: 'min'     },
      { key: 'Tempo',    value: '', unit: 'min/km'  },
    ],
  },
  {
    id: 'gym', name: 'Siłownia', icon: '🏋️', color: '#fb923c', hasEx: true,
    dp: [
      { key: 'Czas treningu', value: '', unit: 'min' },
    ],
  },
  {
    id: 'swim', name: 'Pływanie', icon: '🏊', color: '#38bdf8', hasEx: false,
    dp: [
      { key: 'Dystans', value: '', unit: 'm'   },
      { key: 'Czas',    value: '', unit: 'min' },
    ],
  },
  {
    id: 'box', name: 'Boks', icon: '🥊', color: '#f87171', hasEx: true,
    dp: [
      { key: 'Rundy',        value: '', unit: 'x'   },
      { key: 'Czas rundy',   value: '', unit: 'min' },
      { key: 'Intensywność', value: '', unit: 'RPE' },
    ],
  },
]

export const EXAMPLE_JSON = `{
  "week": {
    "mon": [{
      "discipline": "run",
      "title": "Poranny bieg",
      "params": [
        {"key":"Dystans","value":"10","unit":"km"},
        {"key":"Czas","value":"55","unit":"min"}
      ],
      "exercises": [],
      "notes": "Spokojne tempo"
    }],
    "wed": [{
      "discipline": "gym",
      "title": "Siłownia górna",
      "params": [],
      "exercises": [
        {"name":"Bench Press","sets":"4","reps":"8","load":"80","loadUnit":"kg"}
      ],
      "notes": ""
    }],
    "sun": [{
      "rest": true,
      "title": "Odpoczynek",
      "discipline": "run",
      "params": [], "exercises": [], "notes": ""
    }]
  }
}`
