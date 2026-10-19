import { useMemo } from 'react';
import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import { DRIVERS, TRUCKS } from '../../mock-backend/api.js';
import { useI18n } from '../../i18n/index.js';

export const lastDays = (n) => [dayjs().subtract(n - 1, 'day'), dayjs()];
export const thisMonth = () => [dayjs().startOf('month'), dayjs().endOf('month')];
export const toRange = ([a, b]) => ({ from: a.format('YYYY-MM-DD'), to: b.format('YYYY-MM-DD') });

export function RangeFilter({ value, onChange }) {
  return <DatePicker.RangePicker value={value} onChange={(v) => v && onChange(v)} allowClear={false} format="DD/MM/YYYY" className="range-filter" />;
}

export function DriverFilter({ value, onChange }) {
  const { t, L } = useI18n();
  const options = useMemo(() => DRIVERS.map((d) => ({ value: d.id, label: L(d.name) })), [L]);
  return <Select allowClear placeholder={t('console.filter.allDrivers')} value={value} onChange={onChange} options={options} className="filter-select" />;
}

export function TruckFilter({ value, onChange }) {
  const { t } = useI18n();
  const options = useMemo(() => TRUCKS.map((tk) => ({ value: tk.id, label: tk.plate })), []);
  return <Select allowClear placeholder={t('console.filter.allTrucks')} value={value} onChange={onChange} options={options} className="filter-select" />;
}
