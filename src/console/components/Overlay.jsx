import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from 'antd';

// The console lives inside a decorative browser frame. Drawers are portalled into the console
// root and rendered inline (position: absolute), so they slide over the frame, not the whole page.
export const OverlayContext = createContext(null);

export const useOverlayRoot = () => useContext(OverlayContext);

export function InlineDrawer(props) {
  const root = useOverlayRoot();
  if (!root) return null;
  return createPortal(<Drawer getContainer={false} {...props} />, root);
}
