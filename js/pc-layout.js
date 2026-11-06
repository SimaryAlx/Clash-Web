/* Clash Esports: where each PC sits on the floor, for the portal's map.
   HOW TO MOVE A PC: find its host number below and change x (column, counted from 0 on the left) and y (row,
   counted from 0 at the top). cols and rows are the size of the grid; make them bigger if a seat goes past them.
   Leave an empty column or row for an aisle. Two seats must never share the same x and y.
   areas: the coloured parts of a hall (for example the 21+ part). x, y, w, h are in the same grid cells.
   zones: the Gizmo host groups the place uses (time and price come from the zone, not from the place). */
(function (root) {
root.CLASH_LAYOUT = {
  zayed: [
    {
      id: 'normal', name: { en: 'Normal Hall', ar: 'الصالة العادية' }, kind: 'hall', zones: ['normal', 'normal21'],
      cols: 9, rows: 6,
      seats: [
        { host: 55, x: 0, y: 0 }, { host: 56, x: 1, y: 0 }, { host: 57, x: 2, y: 0 }, { host: 58, x: 3, y: 0 },
        { host: 59, x: 5, y: 0 }, { host: 60, x: 6, y: 0 }, { host: 61, x: 7, y: 0 }, { host: 62, x: 8, y: 0 },
        { host: 63, x: 0, y: 1 }, { host: 64, x: 1, y: 1 }, { host: 65, x: 2, y: 1 }, { host: 66, x: 3, y: 1 },
        { host: 67, x: 5, y: 1 }, { host: 68, x: 6, y: 1 }, { host: 69, x: 7, y: 1 }, { host: 70, x: 8, y: 1 },
        // row 2 is the aisle; the 21+ part starts on row 3
        { host: 71, x: 0, y: 3 }, { host: 72, x: 1, y: 3 }, { host: 73, x: 2, y: 3 }, { host: 74, x: 3, y: 3 },
        { host: 75, x: 5, y: 3 }, { host: 76, x: 6, y: 3 }, { host: 77, x: 7, y: 3 }, { host: 78, x: 8, y: 3 },
        { host: 79, x: 0, y: 4 }, { host: 80, x: 1, y: 4 }, { host: 81, x: 2, y: 4 }, { host: 82, x: 3, y: 4 },
        { host: 83, x: 5, y: 4 }, { host: 84, x: 6, y: 4 }, { host: 85, x: 7, y: 4 }, { host: 86, x: 8, y: 4 },
        { host: 87, x: 0, y: 5 }, { host: 88, x: 1, y: 5 }, { host: 89, x: 2, y: 5 }, { host: 90, x: 3, y: 5 },
      ],
      areas: [
        { zoneId: 'normal', label: { en: 'Normal', ar: 'عادي' }, x: 0, y: 0, w: 9, h: 2 },
        { zoneId: 'normal21', label: { en: 'Normal +21', ar: 'عادي +21' }, x: 0, y: 3, w: 9, h: 3 },
      ],
    },
    {
      id: 'vip', name: { en: 'VIP Hall', ar: 'صالة VIP' }, kind: 'hall', zones: ['vip', 'vip21'],
      cols: 9, rows: 5,
      seats: [
        { host: 21, x: 0, y: 0 }, { host: 22, x: 1, y: 0 }, { host: 23, x: 2, y: 0 }, { host: 24, x: 3, y: 0 },
        { host: 25, x: 5, y: 0 }, { host: 26, x: 6, y: 0 }, { host: 27, x: 7, y: 0 }, { host: 28, x: 8, y: 0 },
        { host: 29, x: 0, y: 1 }, { host: 30, x: 1, y: 1 }, { host: 31, x: 2, y: 1 }, { host: 32, x: 3, y: 1 },
        { host: 33, x: 5, y: 1 }, { host: 34, x: 6, y: 1 }, { host: 35, x: 7, y: 1 }, { host: 36, x: 8, y: 1 },
        // row 2 is the aisle; the 21+ part starts on row 3
        { host: 37, x: 0, y: 3 }, { host: 38, x: 1, y: 3 }, { host: 39, x: 2, y: 3 }, { host: 40, x: 3, y: 3 },
        { host: 41, x: 5, y: 3 }, { host: 42, x: 6, y: 3 }, { host: 43, x: 7, y: 3 }, { host: 44, x: 8, y: 3 },
        { host: 45, x: 0, y: 4 }, { host: 46, x: 1, y: 4 }, { host: 47, x: 2, y: 4 }, { host: 48, x: 3, y: 4 },
        { host: 49, x: 5, y: 4 }, { host: 50, x: 6, y: 4 }, { host: 51, x: 7, y: 4 },
      ],
      areas: [
        { zoneId: 'vip', label: { en: 'VIP', ar: 'VIP' }, x: 0, y: 0, w: 9, h: 2 },
        { zoneId: 'vip21', label: { en: 'VIP +21', ar: 'VIP +21' }, x: 0, y: 3, w: 9, h: 2 },
      ],
    },
    {
      id: 'team1', name: { en: 'Team Room 1', ar: 'أوضة التيم 1' }, kind: 'room', zones: ['team'],
      cols: 5, rows: 1,
      seats: [{ host: 1, x: 0, y: 0 }, { host: 2, x: 1, y: 0 }, { host: 3, x: 2, y: 0 }, { host: 4, x: 3, y: 0 }, { host: 5, x: 4, y: 0 }],
      areas: [{ zoneId: 'team', label: { en: 'Team Room', ar: 'أوضة التيم' }, x: 0, y: 0, w: 5, h: 1 }],
    },
    {
      id: 'team2', name: { en: 'Team Room 2', ar: 'أوضة التيم 2' }, kind: 'room', zones: ['team'],
      cols: 5, rows: 1,
      seats: [{ host: 6, x: 0, y: 0 }, { host: 7, x: 1, y: 0 }, { host: 8, x: 2, y: 0 }, { host: 9, x: 3, y: 0 }, { host: 10, x: 4, y: 0 }],
      areas: [{ zoneId: 'team', label: { en: 'Team Room', ar: 'أوضة التيم' }, x: 0, y: 0, w: 5, h: 1 }],
    },
    {
      id: 'elite', name: { en: 'Elite Room', ar: 'أوضة الإيليت' }, kind: 'room', zones: ['elite'],
      cols: 5, rows: 1,
      seats: [{ host: 11, x: 0, y: 0 }, { host: 12, x: 1, y: 0 }, { host: 13, x: 2, y: 0 }, { host: 14, x: 3, y: 0 }, { host: 15, x: 4, y: 0 }],
      areas: [{ zoneId: 'elite', label: { en: 'Elite Room', ar: 'أوضة الإيليت' }, x: 0, y: 0, w: 5, h: 1 }],
    },
    {
      id: 'cave', name: { en: 'Cave Room', ar: 'أوضة الكهف' }, kind: 'room', zones: ['cave'],
      cols: 5, rows: 1,
      seats: [{ host: 16, x: 0, y: 0 }, { host: 17, x: 1, y: 0 }, { host: 18, x: 2, y: 0 }, { host: 19, x: 3, y: 0 }, { host: 20, x: 4, y: 0 }],
      areas: [{ zoneId: 'cave', label: { en: 'Cave Room', ar: 'أوضة الكهف' }, x: 0, y: 0, w: 5, h: 1 }],
    },
    {
      id: 'stream1', name: { en: 'Stream Room 1', ar: 'أوضة الستريم 1' }, kind: 'room', zones: ['stream'],
      cols: 1, rows: 1,
      seats: [{ host: 91, x: 0, y: 0 }],
      areas: [{ zoneId: 'stream', label: { en: 'Stream Room', ar: 'أوضة الستريم' }, x: 0, y: 0, w: 1, h: 1 }],
    },
    {
      id: 'stream2', name: { en: 'Stream Room 2', ar: 'أوضة الستريم 2' }, kind: 'room', zones: ['stream'],
      cols: 1, rows: 1,
      seats: [{ host: 92, x: 0, y: 0 }],
      areas: [{ zoneId: 'stream', label: { en: 'Stream Room', ar: 'أوضة الستريم' }, x: 0, y: 0, w: 1, h: 1 }],
    },
    {
      id: 'duo', name: { en: 'Duo Stream Room', ar: 'أوضة الستريم دو' }, kind: 'room', zones: ['duo'],
      cols: 2, rows: 1,
      seats: [{ host: 93, x: 0, y: 0 }, { host: 94, x: 1, y: 0 }],
      areas: [{ zoneId: 'duo', label: { en: 'Duo Stream Room', ar: 'أوضة الستريم دو' }, x: 0, y: 0, w: 2, h: 1 }],
    },
  ],
};

if (typeof module !== 'undefined' && module.exports) module.exports = root.CLASH_LAYOUT;
})(typeof window !== 'undefined' ? window : globalThis);
