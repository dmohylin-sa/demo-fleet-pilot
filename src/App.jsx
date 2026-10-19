import { useEffect } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { HashRouter } from 'react-router-dom';
import enUS from 'antd/locale/en_US';
import heIL from 'antd/locale/he_IL';
import dayjs from 'dayjs';
import 'dayjs/locale/he';
import relativeTime from 'dayjs/plugin/relativeTime';
import { antdTheme } from './theme.js';
import { useI18n } from './i18n/index.js';
import DemoShell from './demo/DemoShell.jsx';

dayjs.extend(relativeTime);

export default function App() {
  const { lang, dir } = useI18n();

  useEffect(() => {
    dayjs.locale(lang === 'he' ? 'he' : 'en');
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return (
    <ConfigProvider theme={antdTheme} direction={dir} locale={lang === 'he' ? heIL : enUS}>
      <AntdApp>
        <HashRouter>
          <DemoShell />
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
