import { Logger } from '@sendbird/uikit-utils';

import type { UseGroupChannelList } from '../../types';
import { useGroupChannelListWithCollection } from './useGroupChannelListWithCollection';
import { useGroupChannelListWithQuery } from './useGroupChannelListWithQuery';

/**
 * @deprecated This hook is deprecated and will be replaced by the '@sendbird/uikit-tools' package.
 * */
export const useGroupChannelList: UseGroupChannelList = (sdk, userId, options) => {
  if (sdk.isCacheEnabled || options?.enableCollectionWithoutLocalCache) {
    if (options?.queryCreator) Logger.warn('`queryCreator` is ignored, please use `collectionCreator` instead.');
    return useGroupChannelListWithCollection(sdk, userId, options);
  } else {
    return useGroupChannelListWithQuery(sdk, userId, options);
  }
};
