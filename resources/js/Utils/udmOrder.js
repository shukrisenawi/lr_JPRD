const UDM_DISPLAY_ORDER = [
    'PADANG CHICHAK',
    'KAMPUNG BETONG',
    'KOTA BUKIT',
    'KUALA JENERI',
    'KAMPUNG KALAI',
    'KAMPUNG KUALA BIGIA',
    'KAMPUNG CHEMARA',
    'KAMPUNG BIGIA',
    'KAMPUNG TELUI',
    'BATU LIMA',
    'CHAROK PADANG',
    'HUJONG BANDAR',
    'KAMPUNG BANDAR',
    'TUPAI',
    'FELDA TELUI TIMOR',
    'BERIS JAYA',
];

const UDM_DISPLAY_ORDER_MAP = new Map(UDM_DISPLAY_ORDER.map((name, index) => [name, index]));

export function compareUdms(a, b) {
    const aName = typeof a === 'string' ? a : a?.name ?? a?.udm ?? a?.key ?? '';
    const bName = typeof b === 'string' ? b : b?.name ?? b?.udm ?? b?.key ?? '';
    const aOrder = UDM_DISPLAY_ORDER_MAP.get(aName) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = UDM_DISPLAY_ORDER_MAP.get(bName) ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) return aOrder - bOrder;
    return aName.localeCompare(bName, 'ms');
}

export function orderUdms(udms = []) {
    return [...udms].sort(compareUdms);
}
