// @ts-nocheck - !!REMOVE
import React, { createContext } from 'react';

import type { __domain__ContextType } from '../types';

export const __domain__Context = createContext<__domain__ContextType>({
  fragment: { headerTitle: '' },
});

export const __domain__ContextProvider: React.FC = ({ children }) => {
  // const [visible, setVisible] = useState(false);

  return (
    <__domain__Context.Provider value={{ fragment: { headerTitle: 'LABEL.DOMAIN.HEADER_TITLE' } }}>
      {children}
    </__domain__Context.Provider>
  );
};