import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import './styles.css';
import './demo/demo.css';
import App from './App.jsx';
import { DemoLoginGate } from './demo-login/DemoLoginGate';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DemoLoginGate>
      <App />
    </DemoLoginGate>
  </React.StrictMode>,
);
