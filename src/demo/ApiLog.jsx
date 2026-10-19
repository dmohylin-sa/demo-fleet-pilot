import { useState } from 'react';
import { Card, Switch, Tooltip, Empty } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../mock-backend/store.js';
import { useI18n } from '../i18n/index.js';

// Shows the calls the phone and the console make to the mocked backend.
export default function ApiLog() {
  const { t } = useI18n();
  const log = useStore((s) => s.apiLog);
  const [showPoll, setShowPoll] = useState(false);
  const rows = (showPoll ? log : log.filter((e) => !e.poll)).slice(0, 60);
  return (
    <Card
      className="tool-card api-log"
      title={
        <span>
          <ApiOutlined /> {t('log.title')}
        </span>
      }
      extra={
        <Tooltip title={t('log.showPolling')}>
          <Switch size="small" checked={showPoll} onChange={setShowPoll} />
        </Tooltip>
      }
    >
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('log.empty')} />
      ) : (
        rows.map((e) => (
          <Tooltip key={e.id} title={`${dayjs(e.at).format('HH:mm:ss')} · ${e.status}${e.error ? ` · ${e.error}` : ''}`} placement="left">
            <div className={`api-row${e.status >= 400 ? ' err' : ''}`} dir="ltr">
              <span className={`api-method ${e.method}`}>{e.method}</span>
              <span className="api-path">{e.path}</span>
              <span className="api-ms">{e.ms}ms</span>
            </div>
          </Tooltip>
        ))
      )}
    </Card>
  );
}
