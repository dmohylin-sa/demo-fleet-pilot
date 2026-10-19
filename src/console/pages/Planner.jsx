import { useMemo, useState } from 'react';
import { Alert, App, Button, Select, Table } from 'antd';
import { NodeIndexOutlined, SaveOutlined } from '@ant-design/icons';
import { CUSTOMERS, customer, listPlans, optimizePlan, savePlan } from '../../mock-backend/api.js';
import { usePoll } from '../../shared/usePoll.js';
import { useI18n } from '../../i18n/index.js';
import { fmtDateTime, fmtMin, fmtNum } from '../../shared/format.js';
import MapView from '../../shared/MapView.jsx';
import PageHeader from '../components/PageHeader.jsx';

// Phase 2 during the pilot: route optimisation engine. The dispatcher picks the drops; the stop order
// comes from the same Google route optimisation that Phase 1 uses. No truck-constraint solver.
export default function Planner() {
  const { t, L } = useI18n();
  const { message } = App.useApp();
  const [ids, setIds] = useState(['c3', 'c1', 'c4', 'c2']);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(null);
  const { data: plans, refresh } = usePoll(listPlans, []);
  const options = useMemo(() => CUSTOMERS.map((c) => ({ value: c.id, label: `${L(c.name)} · ${L(c.address)}` })), [L]);

  const pick = (v) => {
    setIds(v);
    setPlan(null);
  };
  const optimize = async () => {
    setBusy('optimize');
    try {
      setPlan(await optimizePlan(ids));
    } finally {
      setBusy(null);
    }
  };
  const save = async () => {
    setBusy('save');
    try {
      await savePlan({ customerIds: plan.stops.map((s) => s.customerId), km: plan.km, naiveKm: plan.naiveKm, durationMin: plan.durationMin });
      message.success(t('console.planner.saved'));
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const savedKm = plan ? plan.naiveKm - plan.km : 0;

  return (
    <div className="page">
      <PageHeader title={t('console.nav.planner')} phase="pilot" desc={t('console.planner.desc')} />
      <Alert type="info" showIcon message={t('console.planner.note')} style={{ marginBottom: 14 }} />
      <div className="filter-row">
        <Select mode="multiple" value={ids} onChange={pick} options={options} placeholder={t('console.planner.pick')} className="drops-select" optionFilterProp="label" maxTagCount="responsive" />
        <Button type="primary" icon={<NodeIndexOutlined />} disabled={ids.length < 2} loading={busy === 'optimize'} onClick={optimize}>
          {t('console.planner.optimize')}
        </Button>
      </div>

      {plan ? (
        <>
          <div className="stat-row">
            <div className="stat">
              <div className="stat-label">{t('console.planner.optKm')}</div>
              <div className="stat-value">
                {fmtNum(plan.km)} {t('unit.km')}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">{t('console.planner.naiveKm')}</div>
              <div className="stat-value muted-value">
                {fmtNum(plan.naiveKm)} {t('unit.km')}
              </div>
              {savedKm > 0 ? <div className="ok-text small">{t('console.planner.savedKm', { n: fmtNum(savedKm) })}</div> : null}
            </div>
            <div className="stat">
              <div className="stat-label">{t('console.planner.duration')}</div>
              <div className="stat-value">{fmtMin(plan.durationMin)}</div>
            </div>
          </div>
          <div className="split-2 planner-split">
            <div className="map-box">
              <MapView
                height={300}
                path={plan.path}
                stops={plan.stops.map((s) => ({ key: s.customerId, lat: s.lat, lng: s.lng, label: String(s.order), status: 'pending', permanent: true }))}
                fitKey={plan.stops.map((s) => s.customerId).join()}
              />
            </div>
            <Table
              size="small"
              rowKey="customerId"
              pagination={false}
              dataSource={plan.stops}
              columns={[
                { title: t('console.col.order'), dataIndex: 'order', width: 48 },
                {
                  title: t('console.col.consignee'),
                  dataIndex: 'name',
                  render: (v, s) => (
                    <div>
                      <div>{L(v)}</div>
                      <div className="muted small">{L(s.address)}</div>
                    </div>
                  ),
                },
                { title: t('console.stop.eta'), dataIndex: 'eta' },
                { title: t('console.planner.legKm'), dataIndex: 'legKm', render: (v) => fmtNum(v) },
              ]}
            />
          </div>
          <div className="filter-row" style={{ marginTop: 12 }}>
            <Button icon={<SaveOutlined />} loading={busy === 'save'} onClick={save}>
              {t('console.planner.save')}
            </Button>
          </div>
        </>
      ) : null}

      <h4 className="sub-title">{t('console.planner.savedPlans')}</h4>
      <Table
        size="small"
        rowKey="id"
        loading={!plans}
        dataSource={plans || []}
        pagination={{ pageSize: 5, hideOnSinglePage: true }}
        scroll={{ x: true }}
        locale={{ emptyText: t('console.planner.noPlans') }}
        columns={[
          { title: t('console.planner.col.plan'), dataIndex: 'id', render: (v) => <span className="mono">{v}</span> },
          { title: t('console.planner.col.saved'), dataIndex: 'at', render: fmtDateTime },
          { title: t('console.planner.col.drops'), dataIndex: 'customerIds', render: (v) => v.map((id, i) => `${i + 1}. ${L(customer(id).name)}`).join(', ') },
          { title: t('unit.km'), dataIndex: 'km', render: (v) => fmtNum(v) },
          { title: t('console.planner.duration'), dataIndex: 'durationMin', render: fmtMin },
        ]}
      />
    </div>
  );
}
