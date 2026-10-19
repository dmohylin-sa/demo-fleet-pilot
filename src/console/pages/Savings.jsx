import { useState } from 'react';
import { Segmented, Skeleton, Table, Tabs, Tag, theme } from 'antd';
import { AimOutlined, FireOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { getReferenceData, getSavings } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { fmtNum } from '../../shared/format.js';
import MetricCard from '../../components/MetricCard.jsx';
import PageHeader from '../components/PageHeader.jsx';

const ils = (n, d = 1) => `₪${fmtNum(n, d)}`;
const INK_MUTED = '#8C8C8C';
const GRID = '#F0F0F0';
const REF_INK = '#595959';

// Phase 2 during the pilot: savings view. The pilot against the Ituran and Pointer reference
// period on two cost lines (km per delivery, estimated fuel cost per delivery), per day or month.
export default function Savings() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHeader title={t('console.nav.savings')} phase="pilot" desc={t('console.savings.desc')} />
      <Tabs
        items={[
          { key: 'pilot', label: t('console.savings.tab.pilot'), children: <PilotTab /> },
          { key: 'ref', label: t('console.savings.tab.reference'), children: <ReferenceTab /> },
        ]}
      />
    </div>
  );
}

function PilotTab() {
  const { t, lang } = useI18n();
  const { token } = theme.useToken();
  const [gran, setGran] = useState('day');
  const { data } = usePoll(() => getSavings(gran), [gran]);
  if (!data) return <Skeleton active />;

  const { reference: ref, total, rows } = data;
  const periodLabel = (p) => (gran === 'month' ? dayjs(`${p}-01`).locale(lang).format('MMM YYYY') : dayjs(p).format('DD/MM'));
  const chartData = rows.map((r) => ({ ...r, label: periodLabel(r.period), value: +r.fuelCostPerDelivery.toFixed(1) }));
  const diff = (saving) => t(saving >= 0 ? 'console.savings.lower' : 'console.savings.higher', { pct: fmtNum(Math.abs(saving), 1) });
  const met = total.savingFuelPct >= total.target;

  return (
    <div>
      <div className="filter-row">
        <Segmented
          value={gran}
          onChange={setGran}
          options={[
            { label: t('console.savings.day'), value: 'day' },
            { label: t('console.savings.month'), value: 'month' },
          ]}
        />
      </div>

      <div className="metric-grid">
        <MetricCard
          label={t('console.savings.kmPerDelivery')}
          value={`${fmtNum(total.kmPerDelivery, 1)} ${t('unit.km')}`}
          sub={`${t('console.savings.ref', { v: `${fmtNum(ref.kmPerDelivery, 1)} ${t('unit.km')}` })} · ${diff(total.savingKmPct)}`}
          icon={<NodeIndexOutlined />}
        />
        <MetricCard
          label={t('console.savings.fuelPerDelivery')}
          value={ils(total.fuelCostPerDelivery)}
          sub={`${t('console.savings.ref', { v: ils(ref.fuelCostPerDelivery) })} · ${diff(total.savingFuelPct)}`}
          icon={<FireOutlined />}
        />
        <MetricCard
          label={t('console.savings.vsTarget')}
          value={`${fmtNum(total.savingFuelPct, 1)}%`}
          sub={t(met ? 'console.savings.targetMet' : 'console.savings.targetOpen', { target: total.target })}
          icon={<AimOutlined />}
          tone={met ? 'primary' : 'neutral'}
        />
      </div>

      <div className="panel chart-panel">
        <div className="chart-head">
          <div className="chart-title">{t('console.savings.chartTitle')}</div>
          <span className="chart-key">
            <i className="key-dash" />
            {t('console.savings.refLine', { v: ils(ref.fuelCostPerDelivery) })}
          </span>
        </div>
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#D9D9D9' }} tick={{ fontSize: 11, fill: INK_MUTED }} minTickGap={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fontSize: 11, fill: INK_MUTED }}
                tickFormatter={(v) => `₪${v}`}
                domain={[0, 'auto']}
                allowDecimals={false}
              />
              <Tooltip cursor={{ fill: 'rgba(22, 119, 255, 0.06)' }} content={<ChartTip />} />
              <ReferenceLine y={+ref.fuelCostPerDelivery.toFixed(1)} stroke={REF_INK} strokeDasharray="5 4" ifOverflow="extendDomain" />
              <Bar dataKey="value" fill={token.colorPrimary} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Table
        size="small"
        rowKey="period"
        dataSource={[...rows].reverse()}
        pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: t('console.savings.col.period'), dataIndex: 'period', render: periodLabel },
          { title: t('console.savings.col.deliveries'), dataIndex: 'deliveries', align: 'right' },
          { title: t('console.savings.col.km'), dataIndex: 'km', align: 'right', render: (v) => fmtNum(v) },
          { title: t('console.savings.col.kmPerDelivery'), dataIndex: 'kmPerDelivery', align: 'right', render: (v) => fmtNum(v, 1) },
          { title: t('console.savings.col.liters'), dataIndex: 'liters', align: 'right', render: (v) => fmtNum(v) },
          { title: t('console.savings.col.fuelCost'), dataIndex: 'fuelCost', align: 'right', render: (v) => ils(v, 0) },
          { title: t('console.savings.col.fuelPerDelivery'), dataIndex: 'fuelCostPerDelivery', align: 'right', render: (v) => ils(v) },
          {
            title: t('console.savings.col.saving'),
            dataIndex: 'savingFuelPct',
            align: 'right',
            render: (v) => <span className={v >= 0 ? 'ok-text' : 'bad-text'}>{`${v > 0 ? '+' : ''}${fmtNum(v, 1)}%`}</span>,
          },
        ]}
      />
    </div>
  );
}

// Value leads, label follows.
function ChartTip({ active, payload }) {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="chart-tip">
      <div className="chart-tip-value">{ils(r.fuelCostPerDelivery)}</div>
      <div className="chart-tip-label">
        {t('console.savings.tipLabel', { period: r.label })} · {t('console.savings.tipDeliveries', { n: r.deliveries })}
      </div>
    </div>
  );
}

function ReferenceTab() {
  const { t } = useI18n();
  const { data } = usePoll(getReferenceData, []);
  return (
    <div>
      <p className="caption">{t('console.savings.refCaption')}</p>
      <Table
        size="small"
        rowKey={(r) => `${r.month}-${r.truckId}`}
        loading={!data}
        dataSource={data || []}
        pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: t('console.savings.col.month'), dataIndex: 'month' },
          { title: t('console.col.truck'), dataIndex: 'plate' },
          { title: t('console.savings.col.source'), dataIndex: 'source', render: (v) => <Tag color={v === 'Ituran' ? 'geekblue' : 'magenta'}>{v}</Tag> },
          { title: t('console.savings.col.km'), dataIndex: 'km', align: 'right', render: (v) => fmtNum(v) },
          { title: t('console.savings.col.liters'), dataIndex: 'liters', align: 'right', render: (v) => fmtNum(v) },
          { title: t('console.savings.col.deliveries'), dataIndex: 'deliveries', align: 'right' },
        ]}
      />
    </div>
  );
}
