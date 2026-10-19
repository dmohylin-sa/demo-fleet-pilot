// Phase 1 #11: bill-of-lading photo with upload and retry; #3: document reading.
// Phase 2 #7: delivery-note photo per drop with matching (#8); #5: offline queue.
// Phase 2 during the pilot #27: document cropping.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Progress, Alert, Spin } from 'antd';
import { CheckCircleFilled, WarningFilled, LoadingOutlined, CloudUploadOutlined, ScissorOutlined, CloseOutlined } from '@ant-design/icons';
import { useStore } from '../../mock-backend/store.js';
import { customer } from '../../mock-backend/api.js';
import { DEMO_BOL, TRUCKS } from '../../mock-backend/seed.js';
import { useI18n } from '../../i18n/index.js';
import { usePhase, PhaseBadge } from '../../demo/phase.jsx';
import DocumentImage from '../../shared/DocumentImage.jsx';
import { fieldLabel } from '../../i18n/common.js';
import { run } from '../phoneApi.js';
import { Screen, usePhoneUi } from '../ui.jsx';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function usePaper(kind, tripId, stopId) {
  const trip = useStore((s) => (tripId ? s.db.trips.find((t) => t.id === tripId) : null));
  return useMemo(() => {
    if (kind === 'bol') {
      return {
        kind,
        docNo: `BL-${48300 + Math.floor(Math.random() * 600)}`,
        plate: TRUCKS[0].plate,
        drops: DEMO_BOL.drops.map((d) => ({ ...d, name: customer(d.customerId).name.he, address: d.rawAddress })),
      };
    }
    const stop = trip.stops.find((s) => s.id === stopId);
    return {
      kind: 'delivery_note',
      docNo: `DN-${75400 + Math.floor(Math.random() * 500)}`,
      bolRef: trip.bol.docNo,
      consignee: customer(stop.customerId).name.he,
      quantity: stop.dropIndex === 2 ? 5 : stop.pallets,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, tripId, stopId]);
}

export default function CaptureScreen({ nav, params }) {
  const { kind = 'bol', tripId, stopId } = params;
  const { t, L } = useI18n();
  const { toast } = usePhoneUi();
  const phase = usePhase();
  const paper = usePaper(kind, tripId, stopId);
  const [stage, setStage] = useState('camera');
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [queueId, setQueueId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const synced = useStore((s) => (queueId ? s.phone.syncResults[queueId] : null));
  const stopCustomerId = useStore((s) => (stopId ? s.db.trips.find((x) => x.id === tripId)?.stops.find((x) => x.id === stopId)?.customerId : null));
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => void (alive.current = false);
  }, []);

  const extract = async (documentId) => {
    setStage('extract');
    try {
      const extraction = await run('extractBol', documentId);
      if (alive.current) nav.replace('confirm', { extraction });
    } catch {
      if (alive.current) setError(t('ph.err.offline'));
    }
  };

  // A queued upload finished syncing after the signal came back.
  useEffect(() => {
    if (!synced || stage !== 'queued') return;
    if (kind === 'bol' && synced.documentId) extract(synced.documentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced]);

  const upload = async () => {
    setStage('upload');
    setError(null);
    setProgress(0);
    const timer = setInterval(() => setProgress((p) => Math.min(92, p + 9)), 110);
    try {
      for (let n = 1; n <= 3; n++) {
        setAttempt(n);
        try {
          const res = kind === 'bol' ? await run('uploadPhoto', { kind: 'bol', paperDocNo: paper.docNo }) : await run('deliveryNote', tripId, stopId, paper.docNo);
          if (!alive.current) return;
          if (res.queued) {
            setQueueId(res.queueId);
            setStage('queued');
            return;
          }
          setProgress(100);
          await sleep(250);
          if (kind === 'bol') await extract(res.documentId);
          else {
            setResult(res);
            setStage('result');
          }
          return;
        } catch (e) {
          if (e.code !== 'network' || n === 3) throw e;
          setProgress(15);
          await sleep(1200);
        }
      }
    } catch {
      if (alive.current) {
        setError(t('ph.capture.failed'));
        setStage('camera');
      }
    } finally {
      clearInterval(timer);
    }
  };

  const shoot = () => (phase.visible('pilot') ? setStage('crop') : upload());
  const title = kind === 'bol' ? t('ph.capture.bolTitle') : t('ph.capture.noteTitle');

  if (stage === 'camera' || stage === 'crop') {
    return (
      <Screen dark padded={false} title={title} onBack={nav.back} extra={<PhaseBadge phase={kind === 'bol' ? 'p1' : 'golive'} short />}>
        <div className={`camera${stage === 'crop' ? ' cropping' : ''}`}>
          <div className="camera-doc">
            <DocumentImage {...paper} tilt={stage === 'crop' ? 0 : -3} />
            {stage === 'crop' ? (
              <div className="crop-box">
                <i className="h tl" />
                <i className="h tr" />
                <i className="h bl" />
                <i className="h br" />
              </div>
            ) : (
              <div className="camera-guides" />
            )}
          </div>
          {error ? <Alert className="camera-alert" type="error" showIcon message={error} /> : null}
          {stage === 'crop' ? (
            <div className="camera-bar crop-bar">
              <div className="crop-note">
                <ScissorOutlined /> {t('ph.capture.cropNote')} <PhaseBadge phase="pilot" short />
              </div>
              <div className="crop-actions">
                <Button ghost icon={<CloseOutlined />} onClick={() => setStage('camera')}>
                  {t('ph.capture.retake')}
                </Button>
                <Button type="primary" onClick={upload}>
                  {t('ph.capture.use')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="camera-bar">
              <div className="camera-hint">{t('ph.capture.hint')}</div>
              <button className="shutter" onClick={shoot} aria-label={t('ph.capture.shoot')} />
            </div>
          )}
        </div>
      </Screen>
    );
  }

  if (stage === 'upload') {
    return (
      <Screen title={title}>
        <div className="center-col">
          <div className="thumb">
            <DocumentImage {...paper} />
          </div>
          <Progress percent={progress} status="active" showInfo={false} />
          <div className="muted">{attempt > 1 ? t('ph.capture.retrying', { n: attempt }) : t('ph.capture.uploading')}</div>
          {attempt > 1 ? <Alert type="warning" showIcon message={t('ph.capture.weak')} /> : null}
        </div>
      </Screen>
    );
  }

  if (stage === 'queued') {
    return (
      <Screen title={title} onBack={kind === 'bol' ? nav.back : undefined} footer={kind === 'bol' ? null : <Button block size="large" onClick={nav.back}>{t('ph.capture.backToTrip')}</Button>}>
        <div className="center-col">
          <CloudUploadOutlined style={{ fontSize: 46, color: '#FAAD14' }} />
          <div className="big-msg">{t('ph.capture.queuedTitle')}</div>
          <div className="muted center">{kind === 'bol' ? t('ph.capture.queuedBol') : t('ph.capture.queuedNote')}</div>
          <PhaseBadge phase="golive" />
          {kind === 'bol' ? <Spin indicator={<LoadingOutlined spin />} /> : null}
        </div>
      </Screen>
    );
  }

  if (stage === 'extract') {
    return (
      <Screen title={t('ph.extract.title')}>
        <div className="center-col">
          <div className="thumb scanning">
            <DocumentImage {...paper} />
            <div className="scanline" />
          </div>
          <ul className="steps-list">
            <li className="done">
              <CheckCircleFilled /> {t('ph.extract.uploaded')}
            </li>
            <li className="doing">
              <LoadingOutlined /> {t('ph.extract.reading')}
            </li>
            <li>{t('ph.extract.addresses')}</li>
          </ul>
          {error ? (
            <Button onClick={() => synced?.documentId && extract(synced.documentId)} danger>
              {t('common.retry')}
            </Button>
          ) : null}
        </div>
      </Screen>
    );
  }

  // Delivery-note result: matched against the bill of lading on number, consignee and quantity.
  const ok = result.match === 'matched';
  const noteValue = (key) => L(result.fields.find((f) => f.key === key).value);
  const rows = [
    ['bolRef', noteValue('bolRef'), paper.bolRef],
    ['consignee', noteValue('consignee'), L(customer(stopCustomerId).name)],
    ['quantity', noteValue('quantity'), result.bolPallets],
  ];
  return (
    <Screen
      title={t('ph.note.resultTitle')}
      footer={
        <Button
          type="primary"
          block
          size="large"
          onClick={() => {
            toast(ok ? t('ph.note.toastOk') : t('ph.note.toastMismatch'), ok ? 'success' : 'warning');
            nav.back();
          }}
        >
          {t('ph.capture.backToTrip')}
        </Button>
      }
    >
      <div className={`match-banner ${ok ? 'ok' : 'warn'}`}>
        {ok ? <CheckCircleFilled /> : <WarningFilled />}
        <div>
          <div className="match-title">{ok ? t('ph.note.matched') : t('ph.note.mismatch')}</div>
          <div className="match-sub">{ok ? t('ph.note.matchedSub') : t('ph.note.mismatchSub', { note: rows[2][1], bol: rows[2][2] })}</div>
        </div>
      </div>
      <table className="cmp">
        <thead>
          <tr>
            <th />
            <th>{t('ph.note.colNote')}</th>
            <th>{t('ph.note.colBol')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, note, bol]) => (
            <tr key={key} className={String(note) !== String(bol) && key === result.mismatchField ? 'bad' : ''}>
              <td>{fieldLabel(t, key)}</td>
              <td>{note}</td>
              <td>{bol}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="muted small" style={{ marginTop: 10 }}>
        <PhaseBadge phase="golive" short /> {t('ph.note.matchRule')}
      </div>
    </Screen>
  );
}
