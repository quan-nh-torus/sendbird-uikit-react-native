import React, { useContext } from 'react';

import type {
  ClipboardServiceInterface,
  FilePickerServiceInterface,
  FileSystemServiceInterface,
  NotificationServiceInterface,
} from '../platform/types';

type Props = {
  notificationService: NotificationServiceInterface;
  filePickerService: FilePickerServiceInterface;
  clipboardService: ClipboardServiceInterface;
  fileSystemService: FileSystemServiceInterface;
};

export const PlatformServiceContext = React.createContext<Props | null>(null);
export const PlatformServiceProvider: React.FC<Props> = ({
  children,
  notificationService,
  filePickerService,
  clipboardService,
  fileSystemService,
}) => {
  return (
    <PlatformServiceContext.Provider
      value={{
        notificationService,
        filePickerService,
        clipboardService,
        fileSystemService,
      }}
    >
      {children}
    </PlatformServiceContext.Provider>
  );
};
export const usePlatformService = () => {
  const value = useContext(PlatformServiceContext);
  if (!value) throw new Error('PlatformServiceContext is not provided');
  return value;
};
